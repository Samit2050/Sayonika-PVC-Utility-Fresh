import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  X, 
  QrCode, 
  Copy, 
  Check, 
  ExternalLink, 
  Sparkles, 
  Send, 
  ShieldCheck, 
  Smartphone, 
  Layers, 
  Calendar, 
  ArrowRight, 
  RefreshCw, 
  HelpCircle,
  Zap,
  Info,
  Radio,
  Lock,
  Star,
  MessageSquare
} from 'lucide-react';
import { 
  SubscriptionPlan, 
  UpiPricingConfig, 
  SubscriptionPaymentRequest, 
  PaymentAppType,
  DEFAULT_SUBSCRIPTION_PLANS,
  getLocalPricingConfig, 
  subscribeToPricingConfig, 
  generateUpiUrl, 
  generateUpiQrCodeDataUrl, 
  submitSubscriptionPaymentRequest, 
  subscribeToUserPaymentRequests 
} from '../utils/subscriptionPaymentService';
import { playCropSuccessSound } from '../utils/audioNotification';

interface SubscriptionPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
  currentUserName?: string;
  userMobile?: string;
  preselectedPlanId?: string;
  onPaymentSuccess?: () => void;
  onOpenMessageAdmin?: () => void;
}

export const SubscriptionPaymentModal: React.FC<SubscriptionPaymentModalProps> = ({
  isOpen,
  onClose,
  currentUserId = '',
  currentUserName = '',
  userMobile = '',
  preselectedPlanId,
  onPaymentSuccess,
  onOpenMessageAdmin,
}) => {
  const [activeTab, setActiveTab] = useState<'pay' | 'history'>('pay');
  const [config, setConfig] = useState<UpiPricingConfig>(getLocalPricingConfig());
  
  // Selected Plan
  const [selectedPlanId, setSelectedPlanId] = useState<string>('plan_90_days');
  
  // Dynamic QR Code State
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isGeneratingQr, setIsGeneratingQr] = useState<boolean>(false);
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);
  const [copiedAmount, setCopiedAmount] = useState<boolean>(false);

  // UTR Submission Form State
  const [formUserId, setFormUserId] = useState<string>(currentUserId || userMobile || '');
  const [formUserName, setFormUserName] = useState<string>(currentUserName || '');
  const [formUtr, setFormUtr] = useState<string>('');
  const [formApp, setFormApp] = useState<PaymentAppType>('phonepe');
  const [formNotes, setFormNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState<string | null>(null);

  // User Payment Requests History State
  const [myRequests, setMyRequests] = useState<SubscriptionPaymentRequest[]>([]);
  const [showUtrHelp, setShowUtrHelp] = useState<boolean>(false);

  // Sync Pricing Config in real-time from Firestore
  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeToPricingConfig((newCfg) => {
      setConfig(newCfg);
    });
    return () => unsub();
  }, [isOpen]);

  // Safe plans list with permanent fallback
  const availablePlans = Array.isArray(config?.plans) && config.plans.length > 0 
    ? config.plans 
    : DEFAULT_SUBSCRIPTION_PLANS;

  // Set initial selected plan from prop if provided
  useEffect(() => {
    if (preselectedPlanId && availablePlans.some(p => p.id === preselectedPlanId)) {
      setSelectedPlanId(preselectedPlanId);
    } else if (availablePlans.length > 0 && !availablePlans.some(p => p.id === selectedPlanId)) {
      setSelectedPlanId(availablePlans[0].id);
    }
  }, [preselectedPlanId, availablePlans, selectedPlanId]);

  // Update form prefill when props change
  useEffect(() => {
    if (currentUserId) setFormUserId(currentUserId);
    if (currentUserName) setFormUserName(currentUserName);
  }, [currentUserId, currentUserName]);

  // Subscribe to user's payment requests in real-time
  useEffect(() => {
    if (!isOpen) return;
    const uid = formUserId || currentUserId;
    if (!uid) return;

    const unsub = subscribeToUserPaymentRequests(uid, (requests) => {
      setMyRequests(Array.isArray(requests) ? requests : []);
    });
    return () => unsub();
  }, [isOpen, formUserId, currentUserId]);

  const selectedPlan: SubscriptionPlan = 
    availablePlans.find(p => p.id === selectedPlanId) || 
    availablePlans[0] || 
    DEFAULT_SUBSCRIPTION_PLANS[0];

  // Generate dynamic UPI QR Code whenever plan, amount, or UPI ID changes
  useEffect(() => {
    if (!isOpen || !selectedPlan) return;

    const generateQr = async () => {
      setIsGeneratingQr(true);
      const note = `${config.qrNote || 'Sayonika PVC Pro'} - ${selectedPlan.name} (${formUserId || 'Operator'})`;
      const upiUrl = generateUpiUrl({
        upiId: config.upiId,
        payeeName: config.payeeName,
        amount: selectedPlan.priceInr,
        transactionNote: note,
      });

      const dataUrl = await generateUpiQrCodeDataUrl(upiUrl);
      setQrCodeDataUrl(dataUrl);
      setIsGeneratingQr(false);
    };

    generateQr();
  }, [isOpen, selectedPlanId, config.upiId, config.payeeName, selectedPlan.priceInr, formUserId]);

  if (!isOpen) return null;

  const handleCopyUpiId = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(config.upiId);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2500);
    }
  };

  const handleCopyAmount = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(selectedPlan.priceInr.toString());
      setCopiedAmount(true);
      setTimeout(() => setCopiedAmount(false), 2500);
    }
  };

  const handleSubmitUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccessMsg(null);

    const uid = formUserId.trim();
    if (!uid) {
      setSubmitError('Please enter your Mobile Number or User ID.');
      return;
    }

    const cleanUtr = formUtr.trim().replace(/\s+/g, '');
    if (!cleanUtr || cleanUtr.length < 6) {
      setSubmitError('Please enter a valid 12-digit UPI UTR / Transaction Reference Number.');
      return;
    }

    setIsSubmitting(true);
    const res = await submitSubscriptionPaymentRequest({
      userId: uid,
      userName: formUserName.trim() || uid,
      userMobile: uid.match(/^\d{10}$/) ? uid : userMobile,
      planId: selectedPlan.id,
      planName: selectedPlan.name,
      planDays: selectedPlan.days,
      amountPaid: selectedPlan.priceInr,
      utrNumber: cleanUtr,
      paymentApp: formApp,
      notes: formNotes.trim(),
    });
    setIsSubmitting(false);

    if (res.success) {
      playCropSuccessSound();
      setSubmitSuccessMsg(`Payment Request Submitted Successfully! Ref ID: ${res.requestId}. Administrator will verify your UTR and activate your subscription.`);
      setFormUtr('');
      setFormNotes('');
      setActiveTab('history');
      if (onPaymentSuccess) {
        onPaymentSuccess();
      }
    } else {
      setSubmitError(res.error || 'Failed to submit payment request.');
    }
  };

  const pendingRequestsCount = myRequests.filter(r => r.status === 'pending').length;

  const upiIntentUrl = generateUpiUrl({
    upiId: config.upiId,
    payeeName: config.payeeName,
    amount: selectedPlan.priceInr,
    transactionNote: `${config.qrNote} - ${selectedPlan.name}`,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="bg-slate-900 border border-slate-750 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Instant Subscription Activation • Option 1 (UPI QR + UTR)
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-mono font-bold">
                  Instant Verification
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Scan UPI QR Code, pay with any UPI App (GPay/PhonePe/Paytm), submit UTR number for immediate activation
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 border-b border-slate-800 bg-slate-950/50 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('pay')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'pay'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <QrCode className="w-4 h-4 text-amber-400" />
            <span>Select Plan & Scan UPI QR</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4 text-blue-400" />
            <span>My Payment Requests & Status</span>
            {pendingRequestsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono animate-pulse">
                {pendingRequestsCount} Pending
              </span>
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          
          {/* TAB 1: Select Plan & Scan UPI QR */}
          {activeTab === 'pay' && (
            <div className="space-y-6">
              
              {/* Step 1: Select Subscription Plan */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-[10px] font-bold">1</span>
                    <span>Choose Your Access Plan</span>
                  </h3>
                  <span className="text-[11px] text-amber-400 font-medium">All Plans include 600 DPI Epson Tray Studio</span>
                </div>

                {/* Plans Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {availablePlans.filter(p => p.isEnabled !== false).map((plan) => {
                    const isSelected = plan.id === selectedPlanId;
                    return (
                      <div
                        key={plan.id}
                        onClick={() => setSelectedPlanId(plan.id)}
                        className={`p-3.5 rounded-xl border transition cursor-pointer relative flex flex-col justify-between ${
                          isSelected
                            ? 'bg-gradient-to-b from-amber-950/60 to-slate-900 border-amber-500/80 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/30'
                            : 'bg-slate-950/60 hover:bg-slate-900/80 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {plan.tag && (
                          <span className={`absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border shadow-sm ${
                            plan.tag.toLowerCase().includes('popular') || plan.tag.toLowerCase().includes('vip')
                              ? 'bg-amber-500 text-slate-950 border-amber-400'
                              : 'bg-blue-600 text-white border-blue-400'
                          }`}>
                            {plan.tag}
                          </span>
                        )}

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-sm text-white">{plan.name}</span>
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected 
                                ? 'bg-amber-500 border-amber-400 text-slate-950' 
                                : 'border-slate-700'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </div>

                          <div className="flex items-baseline gap-2 mb-2">
                            <span className="text-xl font-extrabold text-amber-300">₹{plan.priceInr}</span>
                            {plan.originalPriceInr && (
                              <span className="text-xs text-slate-500 line-through">₹{plan.originalPriceInr}</span>
                            )}
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({plan.days > 0 ? `${plan.days} Days` : 'Lifetime'})
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-300/90 mb-2.5 leading-relaxed">
                            {plan.description}
                          </p>

                          <ul className="space-y-1 text-[10px] text-slate-400">
                            {plan.features?.slice(0, 3).map((feat, idx) => (
                              <li key={idx} className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                <span className="truncate">{feat}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 2 & 3: Dynamic QR Code Payment & UTR Form Split */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-3 border-t border-slate-800">
                
                {/* Left Side (5 cols): Dynamic UPI QR Code & Pay Details */}
                <div className="lg:col-span-5 bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-[10px] font-bold">2</span>
                        <span>Scan & Pay via UPI</span>
                      </h3>
                      <span className="text-xs font-extrabold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-800">
                        ₹{selectedPlan.priceInr} INR
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 mb-3">
                      Scan using Google Pay, PhonePe, Paytm, BHIM, or any Bank UPI app.
                    </p>

                    {/* QR Code Container */}
                    <div className="p-3 bg-white rounded-xl shadow-xl flex flex-col items-center justify-center mx-auto max-w-[220px] relative">
                      {isGeneratingQr ? (
                        <div className="w-48 h-48 flex flex-col items-center justify-center text-slate-700 space-y-2">
                          <RefreshCw className="w-6 h-6 animate-spin text-amber-600" />
                          <span className="text-xs font-medium">Generating QR...</span>
                        </div>
                      ) : qrCodeDataUrl ? (
                        <img 
                          src={qrCodeDataUrl} 
                          alt="UPI Payment QR Code"
                          className="w-48 h-48 object-contain rounded-lg"
                        />
                      ) : (
                        <div className="w-48 h-48 flex items-center justify-center text-slate-500 text-xs">
                          Unable to render QR
                        </div>
                      )}

                      <div className="text-[10px] font-bold text-slate-800 text-center mt-1">
                        Amount: <span className="text-amber-700">₹{selectedPlan.priceInr}</span> • {selectedPlan.name}
                      </div>
                    </div>
                  </div>

                  {/* UPI Details & Copy Buttons */}
                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Payee UPI ID:</span>
                        <button
                          type="button"
                          onClick={handleCopyUpiId}
                          className="text-amber-400 hover:text-amber-300 font-mono font-bold flex items-center gap-1 cursor-pointer"
                          title="Click to copy UPI ID"
                        >
                          {copiedUpi ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedUpi ? 'Copied!' : config.upiId}</span>
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Payee Name:</span>
                        <span className="text-slate-200 font-medium">{config.payeeName}</span>
                      </div>
                    </div>

                    {/* Mobile 1-Click Pay Button */}
                    <a
                      href={upiIntentUrl}
                      className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow flex items-center justify-center gap-2 transition cursor-pointer sm:hidden"
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>Open in UPI App (GPay/PhonePe)</span>
                    </a>
                  </div>
                </div>

                {/* Right Side (7 cols): Submit 12-Digit UTR Form */}
                <div className="lg:col-span-7 bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/40 flex items-center justify-center text-[10px] font-bold">3</span>
                        <span>Submit Transaction UTR / Ref No</span>
                      </h3>
                      <button
                        type="button"
                        onClick={() => setShowUtrHelp(!showUtrHelp)}
                        className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 font-medium cursor-pointer"
                      >
                        <HelpCircle className="w-3 h-3" />
                        <span>Where to find UTR?</span>
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-400 mb-3">
                      After completing payment in your UPI app, enter the 12-digit transaction UTR / Reference ID below for instant verification.
                    </p>

                    {/* Where to find UTR help banner */}
                    {showUtrHelp && (
                      <div className="p-3 bg-sky-950/70 border border-sky-600/40 rounded-xl text-[11px] text-sky-200 space-y-1.5 mb-3 animate-fade-in">
                        <div className="font-bold flex items-center gap-1.5 text-white">
                          <Info className="w-3.5 h-3.5 text-sky-400" />
                          <span>How to find your 12-Digit UPI UTR / Reference ID:</span>
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-slate-300">
                          <li><strong>Google Pay:</strong> Tap Payment History &gt; Selected Payment &gt; Look for <em>"UPI Transaction ID"</em> (12 Digits).</li>
                          <li><strong>PhonePe:</strong> View Transaction Details &gt; Look for <em>"UTR"</em> (e.g. 4238xxxxxxxx).</li>
                          <li><strong>Paytm:</strong> View Passbook / Order Summary &gt; Look for <em>"UPI Ref No"</em>.</li>
                        </ul>
                      </div>
                    )}

                    {/* Alert Notifications */}
                    {submitError && (
                      <div className="p-3 bg-red-950/80 border border-red-800 rounded-xl text-xs text-red-300 flex items-start gap-2 mb-3">
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <span>{submitError}</span>
                      </div>
                    )}

                    {submitSuccessMsg && (
                      <div className="p-3 bg-emerald-950/90 border border-emerald-500 rounded-xl text-xs text-emerald-300 flex items-start gap-2 mb-3">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{submitSuccessMsg}</span>
                      </div>
                    )}

                    {/* Submission Form */}
                    <form onSubmit={handleSubmitUtr} className="space-y-3">
                      
                      {/* User ID / Mobile Number */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1">
                            Mobile Number / User ID *
                          </label>
                          <input
                            type="text"
                            value={formUserId}
                            onChange={(e) => setFormUserId(e.target.value)}
                            placeholder="e.g. 9876543210"
                            required
                            className="w-full bg-slate-900 border border-slate-750 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 outline-none font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1">
                            Operator / Shop Name
                          </label>
                          <input
                            type="text"
                            value={formUserName}
                            onChange={(e) => setFormUserName(e.target.value)}
                            placeholder="e.g. Biswas Xerox"
                            className="w-full bg-slate-900 border border-slate-750 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 outline-none"
                          />
                        </div>
                      </div>

                      {/* Payment App Used & UTR Number */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1">
                            UPI App Used *
                          </label>
                          <select
                            value={formApp}
                            onChange={(e: any) => setFormApp(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-750 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer"
                          >
                            <option value="phonepe">PhonePe</option>
                            <option value="gpay">Google Pay (GPay)</option>
                            <option value="paytm">Paytm</option>
                            <option value="bhim">BHIM UPI</option>
                            <option value="cred">Cred / Amazon Pay</option>
                            <option value="other">Bank App / Other UPI</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center justify-between">
                            <span>12-Digit UTR / Ref No *</span>
                            <span className="text-[10px] text-amber-400 font-normal">Exact 12 Digits</span>
                          </label>
                          <input
                            type="text"
                            value={formUtr}
                            onChange={(e) => setFormUtr(e.target.value)}
                            placeholder="e.g. 423812984123"
                            required
                            className="w-full bg-slate-900 border border-slate-750 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 outline-none font-mono font-bold tracking-wider"
                          />
                        </div>
                      </div>

                      {/* Optional Note */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          Payment Remarks (Optional)
                        </label>
                        <input
                          type="text"
                          value={formNotes}
                          onChange={(e) => setFormNotes(e.target.value)}
                          placeholder="e.g. Paid via GPay at 4:30 PM"
                          className="w-full bg-slate-900 border border-slate-750 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 outline-none"
                        />
                      </div>

                      {/* Submit Button */}
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 active:scale-[0.98] text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                            <span>Submitting Verification Request...</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4 text-slate-950 fill-slate-950" />
                            <span>Submit UTR for Instant Subscription Approval</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </form>
                  </div>

                  {/* Telegram Direct Support Banner */}
                  <div className="p-3 bg-sky-950/40 rounded-xl border border-sky-800/40 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-sky-300">
                      <Send className="w-4 h-4 text-sky-400 shrink-0" />
                      <span className="text-[11px]">Need urgent activation or custom plan?</span>
                    </div>
                    <a
                      href={config.adminTelegram || 'https://t.me/BiswasXerox'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition shrink-0"
                    >
                      <span>Message on Telegram</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: My Payment Requests & Live Status */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-400" />
                    <span>Your Subscription Payment Requests</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Live real-time status updates directly from Firebase Cloud
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('pay')}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow transition cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>+ Submit New Payment</span>
                </button>
              </div>

              {/* Requests List */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60 divide-y divide-slate-800">
                {myRequests.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs space-y-2">
                    <Clock className="w-8 h-8 mx-auto text-slate-600" />
                    <p>No subscription payment requests submitted yet under user "{formUserId || currentUserId || 'current user'}".</p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('pay')}
                      className="text-amber-400 hover:text-amber-300 font-semibold inline-block pt-1 cursor-pointer"
                    >
                      Click here to scan UPI QR and submit your first request
                    </button>
                  </div>
                ) : (
                  myRequests.map((req) => (
                    <div key={req.id} className="p-4 hover:bg-slate-900/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-white">{req.planName}</span>
                          <span className="text-xs font-extrabold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800">
                            ₹{req.amountPaid}
                          </span>
                          
                          {/* Status Badge */}
                          {req.status === 'approved' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>Approved & Active</span>
                            </span>
                          ) : req.status === 'rejected' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 text-rose-400" />
                              <span>Rejected</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 animate-pulse">
                              <Clock className="w-3 h-3 text-amber-400" />
                              <span>Pending Verification</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                          <span className="font-mono text-slate-300">
                            UTR: <strong>{req.utrNumber}</strong> ({req.paymentApp.toUpperCase()})
                          </span>
                          <span>•</span>
                          <span>Submitted: {new Date(req.createdAt).toLocaleString()}</span>
                          {req.grantedExpiresAt && req.grantedExpiresAt > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-300 font-medium">
                                Valid Till: {new Date(req.grantedExpiresAt).toLocaleDateString()}
                              </span>
                            </>
                          )}
                        </div>

                        {req.rejectionReason && (
                          <div className="text-xs text-rose-300 bg-rose-950/40 p-2 rounded-lg border border-rose-800/40 mt-1">
                            Reason: {req.rejectionReason}
                          </div>
                        )}
                      </div>

                      {/* Action */}
                      <div className="self-end sm:self-center">
                        {req.status === 'approved' ? (
                          <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                            <ShieldCheck className="w-4 h-4" />
                            <span>Access Granted</span>
                          </span>
                        ) : req.status === 'rejected' ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPlanId(req.planId);
                              setActiveTab('pay');
                            }}
                            className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg cursor-pointer"
                          >
                            Resubmit UTR
                          </button>
                        ) : (
                          <span className="text-xs text-amber-400 italic">
                            Verifying UTR with Bank...
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>100% Safe UPI QR Processing • Biswas Xerox Centre, Chapra</span>
          </div>

          <div className="flex items-center gap-2">
            {onOpenMessageAdmin && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenMessageAdmin();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-950/70 hover:bg-blue-900 text-blue-300 hover:text-blue-100 rounded-xl border border-blue-700/60 text-xs font-semibold transition cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                <span>Need Help? Message Admin</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Close Window
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Send, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  Phone, 
  Laptop, 
  HelpCircle, 
  ExternalLink,
  ShieldCheck,
  Tag,
  FileText,
  Sparkles,
  Inbox,
  RefreshCw,
  MessageCircle
} from 'lucide-react';
import { 
  UserMessage, 
  MessageCategory, 
  sendMessageToAdmin, 
  subscribeToMyUserMessages 
} from '../utils/userMessageService';
import { AuthSession } from '../utils/authService';
import { getDeviceHardwareInfo } from '../utils/deviceIdentifier';
import { playCropSuccessSound } from '../utils/audioNotification';

interface UserMessageAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  authSession: AuthSession | null;
  initialCategory?: MessageCategory;
}

export const UserMessageAdminModal: React.FC<UserMessageAdminModalProps> = ({
  isOpen,
  onClose,
  authSession,
  initialCategory = 'subscription'
}) => {
  const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose');
  const [name, setName] = useState<string>('');
  const [mobile, setMobile] = useState<string>('');
  const [category, setCategory] = useState<MessageCategory>(initialCategory);
  const [subject, setSubject] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [hardwareId, setHardwareId] = useState<string>('');
  
  const [isSending, setIsSending] = useState<boolean>(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [myMessages, setMyMessages] = useState<UserMessage[]>([]);

  // Initialize fields from current user session & device identifier
  useEffect(() => {
    if (isOpen) {
      if (authSession && !authSession.isPublicGuest) {
        setName(authSession.name || authSession.userId || '');
        setMobile(authSession.mobileNumber || '');
      }
      getDeviceHardwareInfo()
        .then((hw) => {
          setHardwareId(hw.hardwareId || hw.macAddress || '');
        })
        .catch(() => {
          // ignore
        });
    }
  }, [isOpen, authSession]);

  // Subscribe to messages sent by this user
  useEffect(() => {
    if (!isOpen) return;
    const userId = authSession?.userId || 'guest_user';
    const unsub = subscribeToMyUserMessages(userId, mobile || authSession?.mobileNumber, (msgs) => {
      setMyMessages(msgs);
    });
    return () => unsub();
  }, [isOpen, authSession?.userId, mobile]);

  if (!isOpen) return null;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    if (!name.trim()) {
      setErrorMessage('Please enter your name or shop name.');
      return;
    }
    if (!message.trim()) {
      setErrorMessage('Please enter your message or question.');
      return;
    }

    setIsSending(true);
    const res = await sendMessageToAdmin({
      userId: authSession?.userId || 'guest_user',
      userName: name.trim(),
      userMobile: mobile.trim(),
      category,
      subject: subject.trim() || getDefaultSubjectForCategory(category),
      message: message.trim(),
      hardwareId: hardwareId.trim()
    });
    setIsSending(false);

    if (res.success) {
      playCropSuccessSound();
      setSuccessNotice('Your message has been sent to the Admin! The administrator will review and respond shortly.');
      setMessage('');
      setSubject('');
      // Switch to history tab after 1.5 seconds so user can see their submitted message
      setTimeout(() => {
        setActiveTab('history');
      }, 1500);
    } else {
      setErrorMessage(res.error || 'Failed to deliver message. Please check your internet connection.');
    }
  };

  const getDefaultSubjectForCategory = (cat: MessageCategory): string => {
    switch (cat) {
      case 'subscription': return 'Subscription & Payment Help';
      case 'custom_card': return 'New Custom ID Card Template Request';
      case 'pc_binding': return 'Device / MAC ID Binding Assistance';
      case 'technical_issue': return 'Technical Problem / Assistance';
      case 'feedback': return 'App Feedback & Feature Suggestion';
      case 'other': return 'General Inquiry';
    }
  };

  const repliedCount = myMessages.filter(m => m.status === 'replied' && m.adminReply).length;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl text-slate-100 overflow-hidden my-auto flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 shadow-md shadow-orange-500/20 font-bold">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Message to Admin
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-semibold">
                  Direct Support
                </span>
              </div>
              <p className="text-xs text-slate-400">
                এডমিন কে যেকোনো প্রশ্ন বা নতুন কার্ড রিকোয়েস্ট পাঠান
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-800 bg-slate-900/40 px-5 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('compose')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'compose'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Write Message</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'history'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>My Messages & Replies</span>
            {myMessages.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                repliedCount > 0 ? 'bg-emerald-500 text-slate-950 animate-pulse' : 'bg-slate-800 text-slate-300'
              }`}>
                {myMessages.length}
              </span>
            )}
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          
          {activeTab === 'compose' ? (
            <form onSubmit={handleSendMessage} className="space-y-4">
              
              {/* Alert / Notice feedback */}
              {successNotice && (
                <div className="p-3 bg-emerald-950/70 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold">{successNotice}</p>
                    <p className="text-[11px] text-emerald-300/80">You can view responses anytime in the "My Messages & Replies" tab.</p>
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="p-3 bg-red-950/70 border border-red-500/50 rounded-xl text-red-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* User Identity Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Your Name / Shop Name <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Rahul Xerox / Samit"
                      className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    WhatsApp / Mobile Number <span className="text-slate-500 font-normal">(Recommended)</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="tel"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition"
                    />
                  </div>
                </div>
              </div>

              {/* Message Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Message Topic / Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'subscription', label: '💳 Subscription / Pay', desc: 'পেমেন্ট / মেয়াদ' },
                    { id: 'custom_card', label: '🆔 Custom Card Request', desc: 'নতুন আইডি কার্ড' },
                    { id: 'pc_binding', label: '💻 PC / Device Help', desc: 'ডিভাইস বাইন্ডিং' },
                    { id: 'technical_issue', label: '🐛 Technical Support', desc: 'সমস্যা বা সাহায্য' },
                    { id: 'feedback', label: '💡 App Feedback', desc: 'মতামত ও পরামর্শ' },
                    { id: 'other', label: '❓ Other Question', desc: 'সাধারণ জিজ্ঞাসা' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setCategory(cat.id as MessageCategory);
                        if (!subject || subject === getDefaultSubjectForCategory(category)) {
                          setSubject(getDefaultSubjectForCategory(cat.id as MessageCategory));
                        }
                      }}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        category === cat.id
                          ? 'bg-amber-500/15 border-amber-500/60 text-white ring-1 ring-amber-400/40'
                          : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="text-xs font-bold text-slate-200">{cat.label}</span>
                      <span className="text-[10px] text-slate-500 mt-0.5">{cat.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Subject / Topic Title
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={getDefaultSubjectForCategory(category)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none transition"
                />
              </div>

              {/* Detailed Message */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Your Message / Requirement <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  placeholder="আপনার বক্তব্য বা সমস্যা এখানে লিখুন (বাংলা বা ইংরেজি উভয় ভাষাতেই লিখতে পারেন)..."
                  className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl p-3 text-xs text-white placeholder-slate-500 outline-none transition resize-none leading-relaxed"
                  required
                />
              </div>

              {/* Hardware Device Info Pill */}
              {hardwareId && (
                <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-2">
                    <Laptop className="w-3.5 h-3.5 text-blue-400" />
                    <span>Your Device ID will be attached automatically for tech support:</span>
                  </div>
                  <span className="font-mono text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[10px]">
                    {hardwareId.substring(0, 16)}...
                  </span>
                </div>
              )}

              {/* Direct Instant Contact Shortcuts */}
              <div className="pt-1 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 border-t border-slate-800/70">
                <span className="text-[11px]">Need urgent instant help?</span>
                <div className="flex items-center gap-2">
                  <a
                    href="https://t.me/SamitBiltu"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#229ED9]/15 hover:bg-[#229ED9]/25 text-[#229ED9] border border-[#229ED9]/30 text-[11px] font-semibold transition"
                  >
                    <Send className="w-3 h-3" />
                    <span>Telegram Admin</span>
                    <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                  </a>

                  <a
                    href="https://wa.me/919735165902"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/50 text-[11px] font-semibold transition"
                  >
                    <MessageCircle className="w-3 h-3 text-emerald-400" />
                    <span>WhatsApp</span>
                    <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                  </a>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSending}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 active:scale-95 text-slate-950 font-bold text-xs shadow-md shadow-orange-500/20 flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
                >
                  {isSending ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Sending to Admin...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Message to Admin</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          ) : (
            /* My Messages & History Tab */
            <div className="space-y-3">
              {myMessages.length === 0 ? (
                <div className="py-12 text-center text-slate-500 space-y-2">
                  <Inbox className="w-10 h-10 mx-auto text-slate-600 opacity-50" />
                  <p className="text-sm font-semibold text-slate-400">No messages sent yet</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Use the "Write Message" tab to send inquiries, payment questions, or ID card template requests to the admin.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('compose')}
                      className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold transition cursor-pointer"
                    >
                      Write a Message Now
                    </button>
                  </div>
                </div>
              ) : (
                myMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">{msg.subject}</span>
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono capitalize">
                            {msg.category.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>Sent on: {new Date(msg.createdAt).toLocaleString()}</span>
                        </p>
                      </div>

                      {/* Status Badge */}
                      <div>
                        {msg.status === 'replied' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-600/50 text-[11px] font-bold animate-pulse">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Admin Replied</span>
                          </span>
                        ) : msg.status === 'resolved' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-950 text-blue-300 border border-blue-600/50 text-[11px] font-bold">
                            <ShieldCheck className="w-3 h-3 text-blue-400" />
                            <span>Resolved</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-950/60 text-amber-300 border border-amber-600/40 text-[11px] font-semibold">
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>Under Admin Review</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Original Message Text */}
                    <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {msg.message}
                    </div>

                    {/* Admin Reply Section if available */}
                    {msg.adminReply ? (
                      <div className="p-3 bg-emerald-950/40 rounded-xl border border-emerald-600/40 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-emerald-400 font-semibold">
                          <span className="flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Admin Reply ({msg.repliedBy || 'Administrator'}):</span>
                          </span>
                          {msg.repliedAt && (
                            <span className="text-[10px] text-emerald-500/80 font-normal">
                              {new Date(msg.repliedAt).toLocaleString()}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-emerald-100 whitespace-pre-wrap leading-relaxed">
                          {msg.adminReply}
                        </p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500 italic">
                        No reply yet. The administrator has received your message and will review it soon.
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

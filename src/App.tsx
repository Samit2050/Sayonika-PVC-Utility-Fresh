/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Send, RefreshCw } from 'lucide-react';
import { 
  DocumentType, 
  CropBox, 
  CardMarginSettings, 
  ImageAdjustments, 
  PrintSettings, 
  BatchItem,
  CR80_ASPECT_RATIO,
  CR80_WIDTH_MM,
  CR80_HEIGHT_MM,
  CustomSavedTemplate,
  PresetConfig
} from './types';
import { CARD_PRESETS, detectDocTypeFromName, resolvePresetConfig, getDefaultPresetId, DEFAULT_FALLBACK_PRESET, getCombinedPresets } from './utils/cardPresets';
import { purgeAllLegacyTemplatesOnce } from './utils/templateManager';
import { loadPdfAndRenderPage, loadImageToCanvas, getPdfPageCount } from './utils/pdfHelper';
import { cropAndEnhanceRegion } from './utils/imageProcessor';
import { 
  generatePrintPdf, 
  downloadCardSideJpeg, 
  downloadCardBothSidesJpeg, 
  downloadBatchJpegs, 
  CardExportPair 
} from './utils/exporter';
import { generateSampleDocumentCanvas } from './utils/sampleGenerator';
import { 
  cleanFileNameToCardholderName, 
  sanitizeCardholderName,
  extractPasswordCandidateFromFileName,
  extractAllPasswordCandidatesFromFileName
} from './utils/nameHelper';

import { Header } from './components/Header';
import { CanvasEditor } from './components/CanvasEditor';
import { SidebarControls } from './components/SidebarControls';
import { BatchProcessingView } from './components/BatchProcessingView';
import { PrintStudioModal } from './components/PrintStudioModal';
import { PasswordModal } from './components/PasswordModal';
import { DeveloperModal } from './components/DeveloperModal';
import { PresetsGuideView } from './components/PresetsGuideView';
import { SampleTemplateModal } from './components/SampleTemplateModal';
import { SaveTemplateModal } from './components/SaveTemplateModal';
import { EditPresetModal } from './components/EditPresetModal';
import { WelcomeBannerModal } from './components/WelcomeBannerModal';
import { PresetImportExportModal } from './components/PresetImportExportModal';
import { UserManagementModal } from './components/UserManagementModal';
import { UserMessageAdminModal } from './components/UserMessageAdminModal';
import { SubscriptionPaymentModal } from './components/SubscriptionPaymentModal';
import { EpsonPhotoPlusModal } from './components/EpsonPhotoPlusModal';
import { BroadcastPopupModal } from './components/BroadcastPopupModal';
import { BroadcastEditorModal } from './components/BroadcastEditorModal';
import { LoginScreen } from './components/LoginScreen';
import { AdminLoginModal } from './components/AdminLoginModal';
import { PDFiumEngineModal } from './components/PDFiumEngineModal';
import { InternetConnectionGuard } from './components/InternetConnectionGuard';
import { subscribeToAllUserMessages } from './utils/userMessageService';
import { 
  getSavedWorkspaceSettings, 
  saveWorkspaceSettings, 
  subscribeToCloudWorkspaceSettings,
  DEFAULT_MARGIN_SETTINGS, 
  DEFAULT_IMAGE_ADJUSTMENTS, 
  DEFAULT_PRINT_SETTINGS 
} from './utils/workspaceSettings';
import { 
  AuthSession, 
  ensureDefaultAdminExists,
  getLocalSession,
  clearLocalSession,
  logoutUser,
  subscribeToUserSession,
  sendHeartbeat,
  SystemSecurityConfig,
  DEFAULT_SECURITY_CONFIG,
  getLocalSecurityConfig,
  subscribeToSecurityConfig,
  setPublicAccessMode,
  GUEST_PUBLIC_SESSION
} from './utils/authService';
import { 
  BroadcastPopupConfig, 
  DEFAULT_BROADCAST_CONFIG, 
  subscribeToBroadcastConfig 
} from './utils/broadcastService';
import { 
  initCloudPresetsSync, 
  ensureCloudPresetsSeeded,
  performDailyUserTemplateSync,
  subscribeToAdminTemplatePushes
} from './utils/cloudPresetService';
import { presenceService } from './utils/presenceService';
import { 
  playCropSuccessSound, 
  playSingleCropSound 
} from './utils/audioNotification';

export default function App() {
  // Authentication & Session State
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => getLocalSession());
  const [loginError, setLoginError] = useState<string | null>(null);
  const [securityConfig, setSecurityConfig] = useState<SystemSecurityConfig>(() => getLocalSecurityConfig());
  const [isTogglingPublicAccess, setIsTogglingPublicAccess] = useState<boolean>(false);
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState<boolean>(false);
  const [templatePushNotice, setTemplatePushNotice] = useState<{ message: string; timestamp: number } | null>(null);

  // Determine effective session: if direct public access is enabled and no specific admin/operator is logged in, automatically provide guest access without showing any login window
  const effectiveSession: AuthSession | null = authSession || (securityConfig.publicAccessEnabled ? GUEST_PUBLIC_SESSION : null);

  // Navigation & UI States
  const [activeTab, setActiveTab] = useState<'editor' | 'batch' | 'print' | 'guide'>('batch');
  const [isBroadcastPopupOpen, setIsBroadcastPopupOpen] = useState<boolean>(true);
  const [isBroadcastEditorOpen, setIsBroadcastEditorOpen] = useState<boolean>(false);
  const [broadcastConfig, setBroadcastConfig] = useState<BroadcastPopupConfig>(DEFAULT_BROADCAST_CONFIG);
  const [isDeveloperModalOpen, setIsDeveloperModalOpen] = useState<boolean>(false);
  const [isSampleModalOpen, setIsSampleModalOpen] = useState<boolean>(false);
  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState<boolean>(false);
  const [isEditPresetModalOpen, setIsEditPresetModalOpen] = useState<boolean>(false);
  const [isPresetImportExportModalOpen, setIsPresetImportExportModalOpen] = useState<boolean>(false);
  const [isUserManagementModalOpen, setIsUserManagementModalOpen] = useState<boolean>(false);
  const [userManagementInitialTab, setUserManagementInitialTab] = useState<'users' | 'requests' | 'messages' | 'pricing' | 'telegram' | 'public' | 'hardware'>('users');
  const [isUserMessageModalOpen, setIsUserMessageModalOpen] = useState<boolean>(false);
  const [unreadUserMessagesCount, setUnreadUserMessagesCount] = useState<number>(0);
  const [isSubscriptionPaymentModalOpen, setIsSubscriptionPaymentModalOpen] = useState<boolean>(false);
  const [isEpsonPrintModalOpen, setIsEpsonPrintModalOpen] = useState<boolean>(false);
  const [isPdfiumModalOpen, setIsPdfiumModalOpen] = useState<boolean>(false);
  const [presetImportExportTab, setPresetImportExportTab] = useState<'export' | 'import'>('export');
  const [editingPreset, setEditingPreset] = useState<PresetConfig | null>(null);
  const [passwordModalItem, setPasswordModalItem] = useState<BatchItem | null>(null);

  // Initialize DB & Seed Admin & Subscribe to Global Security Config
  useEffect(() => {
    ensureDefaultAdminExists();

    // Subscribe to Firestore broadcast popup in real-time
    const unsubscribeBroadcast = subscribeToBroadcastConfig((cfg) => {
      setBroadcastConfig(cfg);
    });

    // Subscribe to Firestore public access security config in real-time
    const unsubscribeSecurity = subscribeToSecurityConfig((cfg) => {
      setSecurityConfig(cfg);

      // If public access was just disabled by an admin and current session is a guest session, safely logout
      if (!cfg.publicAccessEnabled) {
        const current = getLocalSession();
        if (current && (current.isPublicGuest || current.userId === 'public_guest' || current.sessionToken === 'public_open_access_token')) {
          clearLocalSession();
          setAuthSession(null);
          setLoginError('Public Access has been disabled by Administrator. Login is now required.');
        }
      }
    });

    // Subscribe to Firestore workspace settings so operator preferences are preserved forever
    const unsubscribeWorkspace = subscribeToCloudWorkspaceSettings((cloudSettings) => {
      if (cloudSettings.marginSettings) setMarginSettings(prev => ({ ...prev, ...cloudSettings.marginSettings }));
      if (cloudSettings.imageAdjustments) setImageAdjustments(prev => ({ ...prev, ...cloudSettings.imageAdjustments }));
      if (cloudSettings.printSettings) setPrintSettings(prev => ({ ...prev, ...cloudSettings.printSettings }));
      if (cloudSettings.saveDpi) setSaveDpi(cloudSettings.saveDpi);
      if (cloudSettings.isDualSided !== undefined) setIsDualSided(cloudSettings.isDualSided);
      if (cloudSettings.lockAspectRatio !== undefined) setLockAspectRatio(cloudSettings.lockAspectRatio);
      if (cloudSettings.selectedPresetId) setSelectedPresetId(cloudSettings.selectedPresetId);
      if (cloudSettings.frontBox) setFrontBox(cloudSettings.frontBox);
      if (cloudSettings.backBox) setBackBox(cloudSettings.backBox);
    });

    // Subscribe to Firestore user messages in real-time to keep unread notification counter accurate
    const unsubscribeMessages = subscribeToAllUserMessages((msgs) => {
      const unread = msgs.filter((m) => m.status === 'unread').length;
      setUnreadUserMessagesCount(unread);
    });

    return () => {
      unsubscribeBroadcast();
      unsubscribeSecurity();
      unsubscribeWorkspace();
      unsubscribeMessages();
    };
  }, []);

  // Real-time user session watcher & heartbeat sync
  useEffect(() => {
    if (!effectiveSession) return;

    // Real-time listener for current user's session token & allowed state (only for registered accounts, not guest)
    const unsubscribeSession = effectiveSession.isPublicGuest
      ? () => {}
      : subscribeToUserSession(
          effectiveSession.userId,
          effectiveSession.sessionToken,
          (reason) => {
            setAuthSession(null);
            clearLocalSession();
            setLoginError(reason);
          }
        );

    // Heartbeat every 60s
    const heartbeatTimer = setInterval(() => {
      if (!effectiveSession.isPublicGuest) {
        sendHeartbeat(effectiveSession.userId);
      }
    }, 60000);

    // Start live bidirectional real-time synchronization with Firestore shared_presets
    const unsubscribeCloudPresets = initCloudPresetsSync();

    // Ensure all custom presets are permanently seeded and uploaded to Cloud Firestore
    ensureCloudPresetsSeeded(effectiveSession);

    // Regular Once-a-Day Template Sync for Users:
    // Auto-downloads fresh templates from Cloud database and deletes all old local templates (Only for non-admin regular users)
    performDailyUserTemplateSync(effectiveSession, { force: false }).then((res) => {
      if (res.performed) {
        console.log(`[Sayonika Daily Sync] Auto-updated ${res.count} templates from Cloud.`);
      }
    }).catch((err) => {
      console.warn('[Sayonika Daily Sync] Notice:', err);
    });

    // Check periodically every hour if 24 hours have elapsed
    const dailySyncCheckTimer = setInterval(() => {
      performDailyUserTemplateSync(effectiveSession, { force: false }).catch(() => {});
    }, 60 * 60 * 1000);

    // Listen for live instant template pushes sent manually by Admin
    const unsubscribeTemplatePushes = subscribeToAdminTemplatePushes(effectiveSession, (info) => {
      setTemplatePushNotice({
        message: `🚀 Instant Update: Admin (${info.pushedBy}) published a fresh template update! Old templates cleared and ${info.count} fresh template(s) downloaded.`,
        timestamp: Date.now()
      });
      playCropSuccessSound();
      setTimeout(() => setTemplatePushNotice(null), 8000);
    });

    // Initialize real-time presence heartbeat and record visit count
    presenceService.initPresenceTracking(effectiveSession);

    return () => {
      unsubscribeSession();
      clearInterval(heartbeatTimer);
      clearInterval(dailySyncCheckTimer);
      unsubscribeCloudPresets();
      unsubscribeTemplatePushes();
      presenceService.destroy();
    };
  }, [effectiveSession?.userId, effectiveSession?.sessionToken, effectiveSession?.isPublicGuest]);

  const handleLogout = async () => {
    if (authSession && !authSession.isPublicGuest) {
      await logoutUser(authSession);
    }
    clearLocalSession();
    setAuthSession(null);
    setLoginError(null);
  };

  const handleTogglePublicAccess = async () => {
    if (effectiveSession?.role !== 'admin') return;
    setIsTogglingPublicAccess(true);
    const nextMode = !securityConfig.publicAccessEnabled;
    await setPublicAccessMode(nextMode, effectiveSession.name || effectiveSession.userId);
    setIsTogglingPublicAccess(false);
  };

  // Purge legacy custom and default templates on boot for fresh start
  purgeAllLegacyTemplatesOnce();

  // Active Editor Document & Persistent Workspace State
  const savedWorkspace = getSavedWorkspaceSettings();
  const initialPresetId = savedWorkspace.selectedPresetId || getDefaultPresetId();
  const initialPreset = resolvePresetConfig(initialPresetId) || DEFAULT_FALLBACK_PRESET;

  const [sourceCanvas, setSourceCanvas] = useState<HTMLCanvasElement | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string>('e-Aadhaar_UIDAI_Sample.pdf');
  const [activeCardHolderName, setActiveCardHolderName] = useState<string>('e-Aadhaar UIDAI');
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [frontPageNumber, setFrontPageNumber] = useState<number>(initialPreset.frontPage || 1);
  const [backPageNumber, setBackPageNumber] = useState<number>(initialPreset.backPage || 1);
  const [selectedPresetId, setSelectedPresetId] = useState<string>(initialPreset.id);

  // Crop Boxes
  const [frontBox, setFrontBox] = useState<CropBox>(
    savedWorkspace.frontBox || {
      id: 'front',
      label: 'Front Side',
      x: initialPreset.frontBox.x,
      y: initialPreset.frontBox.y,
      width: initialPreset.frontBox.width,
      height: initialPreset.frontBox.height,
      color: '#10B981',
    }
  );

  const [backBox, setBackBox] = useState<CropBox | undefined>(
    savedWorkspace.backBox || (initialPreset.backBox
      ? {
          id: 'back',
          label: 'Back Side',
          x: initialPreset.backBox.x,
          y: initialPreset.backBox.y,
          width: initialPreset.backBox.width,
          height: initialPreset.backBox.height,
          color: '#3B82F6',
        }
      : undefined)
  );

  const [activeBoxId, setActiveBoxId] = useState<'front' | 'back'>('front');
  const [isDualSided, setIsDualSided] = useState<boolean>(savedWorkspace.isDualSided ?? initialPreset.dualSided);
  const [lockAspectRatio, setLockAspectRatio] = useState<boolean>(savedWorkspace.lockAspectRatio ?? true);

  // Settings & Adjustments (Loaded from persistent storage forever)
  const [marginSettings, setMarginSettings] = useState<CardMarginSettings>(
    savedWorkspace.marginSettings ? { ...DEFAULT_MARGIN_SETTINGS, ...savedWorkspace.marginSettings } : DEFAULT_MARGIN_SETTINGS
  );

  const [imageAdjustments, setImageAdjustments] = useState<ImageAdjustments>(
    savedWorkspace.imageAdjustments ? { ...DEFAULT_IMAGE_ADJUSTMENTS, ...savedWorkspace.imageAdjustments } : DEFAULT_IMAGE_ADJUSTMENTS
  );

  const [printSettings, setPrintSettings] = useState<PrintSettings>(
    savedWorkspace.printSettings ? { ...DEFAULT_PRINT_SETTINGS, ...savedWorkspace.printSettings } : DEFAULT_PRINT_SETTINGS
  );

  // Save Resolution DPI Option (Strictly 600 DPI Ultra HD)
  const [saveDpi, setSaveDpi] = useState<number>(savedWorkspace.saveDpi ?? 600);

  // Real-time Processed Previews
  const [frontPreviewCanvas, setFrontPreviewCanvas] = useState<HTMLCanvasElement | null>(null);
  const [backPreviewCanvas, setBackPreviewCanvas] = useState<HTMLCanvasElement | null>(null);

  // Batch Processing States
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState<boolean>(false);
  const [batchProgress, setBatchProgress] = useState<number>(0);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState<boolean>(savedWorkspace.autoSaveEnabled ?? true);
  const [savedBatchPassword, setSavedBatchPassword] = useState<string>(savedWorkspace.savedBatchPassword || '');
  const [activePdfPassword, setActivePdfPassword] = useState<string>('');

  const hiddenFileInputRef = useRef<HTMLInputElement>(null);

  // Persist all user changes forever so the app NEVER resets automatically
  useEffect(() => {
    saveWorkspaceSettings({
      selectedPresetId,
      marginSettings,
      imageAdjustments,
      printSettings,
      saveDpi,
      isDualSided,
      lockAspectRatio,
      autoSaveEnabled,
      savedBatchPassword,
      frontBox,
      backBox,
    });
  }, [
    selectedPresetId,
    marginSettings,
    imageAdjustments,
    printSettings,
    saveDpi,
    isDualSided,
    lockAspectRatio,
    autoSaveEnabled,
    savedBatchPassword,
    frontBox,
    backBox,
  ]);

  // Initialize with authentic sample Aadhaar on first load
  useEffect(() => {
    const sampleCanvas = generateSampleDocumentCanvas('aadhaar');
    setSourceCanvas(sampleCanvas);
    setCurrentFileName('e-Aadhaar_UIDAI_Sample.pdf');
    setCurrentPage(1);
    setTotalPages(1);
  }, []);

  // Update Live Processed Previews whenever sourceCanvas, boxes, margins, adjustments, or saveDpi change
  useEffect(() => {
    let isCancelled = false;

    const updatePreviews = async () => {
      if (!sourceCanvas) {
        setFrontPreviewCanvas(null);
        setBackPreviewCanvas(null);
        return;
      }

      try {
        if (currentFile && totalPages > 1 && (frontPageNumber !== currentPage || (isDualSided && backBox && backPageNumber !== currentPage))) {
          // If front page is different from current viewport page:
          let fCanvas = sourceCanvas;
          if (frontPageNumber !== currentPage) {
            const fRes = await loadPdfAndRenderPage(currentFile, frontPageNumber, savedBatchPassword, saveDpi);
            if (fRes.success && fRes.page) fCanvas = fRes.page.canvas;
          }
          if (isCancelled) return;
          const frontCrop = cropAndEnhanceRegion(fCanvas, frontBox, imageAdjustments, marginSettings, saveDpi);
          setFrontPreviewCanvas(frontCrop);

          if (isDualSided && backBox) {
            let bCanvas = sourceCanvas;
            if (backPageNumber !== currentPage) {
              if (backPageNumber === frontPageNumber) {
                bCanvas = fCanvas;
              } else {
                const bRes = await loadPdfAndRenderPage(currentFile, backPageNumber, savedBatchPassword, saveDpi);
                if (bRes.success && bRes.page) bCanvas = bRes.page.canvas;
              }
            }
            if (isCancelled) return;
            const backCrop = cropAndEnhanceRegion(bCanvas, backBox, imageAdjustments, marginSettings, saveDpi);
            setBackPreviewCanvas(backCrop);
          } else {
            setBackPreviewCanvas(null);
          }
        } else {
          // Standard single-page or both on current page
          const frontCrop = cropAndEnhanceRegion(sourceCanvas, frontBox, imageAdjustments, marginSettings, saveDpi);
          setFrontPreviewCanvas(frontCrop);

          if (isDualSided && backBox) {
            const backCrop = cropAndEnhanceRegion(sourceCanvas, backBox, imageAdjustments, marginSettings, saveDpi);
            setBackPreviewCanvas(backCrop);
          } else {
            setBackPreviewCanvas(null);
          }
        }
      } catch (e) {
        console.error('Error generating card previews:', e);
      }
    };

    updatePreviews();

    return () => {
      isCancelled = true;
    };
  }, [sourceCanvas, currentFile, currentPage, totalPages, frontPageNumber, backPageNumber, frontBox, backBox, isDualSided, marginSettings, imageAdjustments, savedBatchPassword, saveDpi]);

  // Handle Preset Selection (Official Presets or User Saved Templates)
  const applyPreset = useCallback((presetId: string) => {
    const preset = resolvePresetConfig(presetId) || DEFAULT_FALLBACK_PRESET;
    if (!preset) return;

    setSelectedPresetId(preset.id);
    setIsDualSided(preset.dualSided);

    if (preset.frontPage) {
      setFrontPageNumber(preset.frontPage);
    }
    if (preset.backPage) {
      setBackPageNumber(preset.backPage);
    }

    setFrontBox({
      id: 'front',
      label: 'Front Side',
      x: preset.frontBox.x,
      y: preset.frontBox.y,
      width: preset.frontBox.width,
      height: preset.frontBox.height,
      color: '#10B981',
    });

    if (preset.dualSided && preset.backBox) {
      setBackBox({
        id: 'back',
        label: 'Back Side',
        x: preset.backBox.x,
        y: preset.backBox.y,
        width: preset.backBox.width,
        height: preset.backBox.height,
        color: '#3B82F6',
      });
    } else {
      setBackBox(undefined);
    }
  }, []);

  // Handle File Upload & PDF Rendering
  const handleLoadFile = async (file: File, password?: string) => {
    setCurrentFile(file);
    setCurrentFileName(file.name);
    const initialCleanName = cleanFileNameToCardholderName(file.name);
    setActiveCardHolderName(initialCleanName);

    // Auto-extract candidate password from filename in CAPITAL LETTERS
    const candidatePassword = extractPasswordCandidateFromFileName(file.name);
    const effPassword = (password || candidatePassword || activePdfPassword || savedBatchPassword || '').toUpperCase();

    if (effPassword) {
      setActivePdfPassword(effPassword);
    }

    // Auto-detect preset from file name
    const detection = detectDocTypeFromName(file.name);
    applyPreset(detection.presetId);

    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      const res = await loadPdfAndRenderPage(file, 1, effPassword, saveDpi);
      if (res.success && res.page) {
        setSourceCanvas(res.page.canvas);
        setCurrentPage(res.page.pageNumber);
        setTotalPages(res.page.totalPdfPages);
        if (res.page.detectedCardholderName) {
          setActiveCardHolderName(res.page.detectedCardholderName);
        }
        if (res.usedPassword) {
          setActivePdfPassword(res.usedPassword.toUpperCase());
        }

        const preset = resolvePresetConfig(detection.presetId);
        setFrontPageNumber(preset?.frontPage || 1);
        setBackPageNumber(preset?.backPage || (res.page.totalPdfPages >= 2 ? 2 : 2));
        playSingleCropSound();
      } else if (res.isPasswordRequired) {
        // Show password unlock modal with autofilled candidate in CAPITAL LETTERS
        const suggested = (res.suggestedPassword || candidatePassword || '').toUpperCase();
        const tempItem: BatchItem = {
          id: 'temp_active',
          file,
          name: file.name,
          cardHolderName: initialCleanName,
          size: file.size,
          status: 'password_required',
          docType: detection.docType,
          presetId: detection.presetId,
          password: suggested,
          numPages: 1,
          currentPage: 1,
          frontPageNumber: 1,
          backPageNumber: 1,
          frontBox: { id: 'front', label: 'Front', x: 5, y: 70, width: 43, height: 26, color: '#10B981' },
        };
        setPasswordModalItem(tempItem);
      } else {
        console.error('Failed to open PDF:', res.error);
        alert(res.error || 'Failed to open PDF document. Please verify the file is not corrupted or password-protected.');
      }
    } else {
      // Image file
      const imgCanvas = await loadImageToCanvas(file);
      setSourceCanvas(imgCanvas);
      setCurrentPage(1);
      setTotalPages(1);
      setFrontPageNumber(1);
      setBackPageNumber(1);
      playSingleCropSound();
    }
  };

  // Add Files / Folder to Batch Queue
  const handleFilesSelected = (files: FileList | File[]) => {
    const newItems: BatchItem[] = [];
    const validExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tiff'];
    const fileArray = Array.from(files).filter((f) => {
      const name = f.name.toLowerCase();
      if (name.startsWith('.') || name.startsWith('~$') || name === 'thumbs.db' || name === 'desktop.ini') {
        return false;
      }
      return validExtensions.some((ext) => name.endsWith(ext));
    });

    fileArray.forEach((file) => {
      const detection = detectDocTypeFromName(file.name);
      const preset = resolvePresetConfig(detection.presetId) || DEFAULT_FALLBACK_PRESET;
      const initialCleanName = cleanFileNameToCardholderName(file.name);
      const extractedPassword = extractPasswordCandidateFromFileName(file.name);
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

      const item: BatchItem = {
        id: `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        file,
        name: file.name,
        cardHolderName: initialCleanName,
        size: file.size,
        status: 'pending',
        password: extractedPassword ? extractedPassword.toUpperCase() : undefined,
        docType: detection.docType,
        presetId: preset.id,
        numPages: isPdf ? 2 : 1,
        currentPage: 1,
        frontPageNumber: preset.frontPage || 1,
        backPageNumber: preset.backPage || (isPdf ? 2 : (preset.dualSided ? 2 : 1)),
        frontBox: {
          id: 'front',
          label: 'Front Side',
          x: preset.frontBox.x,
          y: preset.frontBox.y,
          width: preset.frontBox.width,
          height: preset.frontBox.height,
          color: '#10B981',
        },
        backBox: preset.backBox
          ? {
              id: 'back',
              label: 'Back Side',
              x: preset.backBox.x,
              y: preset.backBox.y,
              width: preset.backBox.width,
              height: preset.backBox.height,
              color: '#3B82F6',
            }
          : undefined,
      };

      newItems.push(item);
    });

    setBatchItems((prev) => [...prev, ...newItems]);
    setActiveTab('batch');

    // Asynchronously scan PDF page counts for all newly queued items
    newItems.forEach(async (newItem) => {
      if (newItem.file.type === 'application/pdf' || newItem.file.name.toLowerCase().endsWith('.pdf')) {
        try {
          const count = await getPdfPageCount(newItem.file, newItem.password);
          if (count > 0) {
            setBatchItems((prev) =>
              prev.map((it) =>
                it.id === newItem.id
                  ? {
                      ...it,
                      numPages: count,
                      frontPageNumber: it.frontPageNumber || 1,
                      backPageNumber: it.backPageNumber || (count >= 2 ? 2 : 1),
                    }
                  : it
              )
            );
          }
        } catch {
          // ignore
        }
      }
    });

    // If first file and no current file, load into editor too
    if (!currentFile && newItems.length > 0) {
      handleLoadFile(newItems[0].file);
    }
  };

  // Process a Single Batch Item
  const processBatchItem = async (item: BatchItem, passwordToUse?: string): Promise<BatchItem> => {
    try {
      let frontCanvas: HTMLCanvasElement;
      let backCanvas: HTMLCanvasElement | null = null;
      let totalP = 1;
      let detectedName: string | undefined = undefined;

      const effPassword = (passwordToUse || item.password || savedBatchPassword || '').toUpperCase();

      if (item.file.type === 'application/pdf' || item.file.name.toLowerCase().endsWith('.pdf')) {
        const frontP = item.frontPageNumber || item.currentPage || 1;
        const renderRes = await loadPdfAndRenderPage(item.file, frontP, effPassword, saveDpi);
        if (!renderRes.success || !renderRes.page) {
          if (renderRes.isPasswordRequired) {
            return { 
              ...item, 
              status: 'password_required',
              password: item.password || (renderRes.suggestedPassword ? renderRes.suggestedPassword.toUpperCase() : undefined)
            };
          }
          return { ...item, status: 'error', errorMessage: renderRes.error };
        }
        frontCanvas = renderRes.page.canvas;
        totalP = renderRes.page.totalPdfPages;
        if (renderRes.page.detectedCardholderName) {
          detectedName = renderRes.page.detectedCardholderName;
        }

        if (item.backBox) {
          const backP = item.backPageNumber || (totalP >= 2 ? 2 : 1);
          if (backP === frontP) {
            backCanvas = frontCanvas;
          } else {
            const backRenderRes = await loadPdfAndRenderPage(item.file, backP, effPassword, saveDpi);
            if (backRenderRes.success && backRenderRes.page) {
              backCanvas = backRenderRes.page.canvas;
            } else {
              backCanvas = frontCanvas;
            }
          }
        }
      } else {
        frontCanvas = await loadImageToCanvas(item.file);
        backCanvas = item.backBox ? frontCanvas : null;
      }

      // Render front crop at chosen saveDpi (300 DPI or 600 DPI Ultra HD)
      const frontCrop = cropAndEnhanceRegion(frontCanvas, item.frontBox, imageAdjustments, marginSettings, saveDpi);
      const frontCropUrl = frontCrop.toDataURL('image/png');

      // Render back crop if exists at chosen saveDpi
      let backCropUrl: string | undefined = undefined;
      if (item.backBox && backCanvas) {
        const backCrop = cropAndEnhanceRegion(backCanvas, item.backBox, imageAdjustments, marginSettings, saveDpi);
        backCropUrl = backCrop.toDataURL('image/png');
      }

      // Prioritize candidate name detected from document metadata or text
      const initialFallback = cleanFileNameToCardholderName(item.name);
      let finalCardHolderName = item.cardHolderName;
      if (detectedName) {
        finalCardHolderName = detectedName;
      } else if (!finalCardHolderName) {
        finalCardHolderName = initialFallback;
      }

      return {
        ...item,
        cardHolderName: finalCardHolderName,
        status: 'completed',
        numPages: totalP,
        previewUrl: frontCanvas.toDataURL('image/jpeg', 0.6),
        frontCropUrl,
        backCropUrl,
        processedDate: Date.now(),
      };
    } catch (err: unknown) {
      return {
        ...item,
        status: 'error',
        errorMessage: (err as Error)?.message || 'Failed to process',
      };
    }
  };

  // Password and Processing Cancellation Refs
  const abortBatchRef = useRef<boolean>(false);

  // Stop / Cancel on-going batch cropping immediately
  const handleStopBatchProcessing = () => {
    abortBatchRef.current = true;
    setIsBatchProcessing(false);
    setBatchItems((prev) =>
      prev.map((it) => (it.status === 'processing' ? { ...it, status: 'pending' } : it))
    );
  };

  // Run Batch Process for All Items
  const handleProcessAllBatch = async () => {
    if (batchItems.length === 0 || isBatchProcessing) return;

    abortBatchRef.current = false;
    setIsBatchProcessing(true);
    setBatchProgress(0);

    const updated: BatchItem[] = [];
    const exportPairs: CardExportPair[] = [];

    for (let i = 0; i < batchItems.length; i++) {
      if (abortBatchRef.current) {
        break;
      }
      const item = batchItems[i];
      setBatchItems((prev) =>
        prev.map((it, idx) => (idx === i ? { ...it, status: 'processing' } : it))
      );

      const processed = await processBatchItem(item);
      if (abortBatchRef.current) {
        break;
      }
      updated.push(processed);

      // Add to export pairs if completed
      if (processed.status === 'completed' && processed.frontCropUrl) {
        const frontImg = new Image();
        frontImg.src = processed.frontCropUrl;
        await new Promise((r) => { frontImg.onload = r; });

        const frontC = document.createElement('canvas');
        frontC.width = frontImg.naturalWidth;
        frontC.height = frontImg.naturalHeight;
        frontC.getContext('2d')?.drawImage(frontImg, 0, 0);

        let backC: HTMLCanvasElement | undefined = undefined;
        if (processed.backCropUrl) {
          const backImg = new Image();
          backImg.src = processed.backCropUrl;
          await new Promise((r) => { backImg.onload = r; });
          backC = document.createElement('canvas');
          backC.width = backImg.naturalWidth;
          backC.height = backImg.naturalHeight;
          backC.getContext('2d')?.drawImage(backImg, 0, 0);
        }

        exportPairs.push({
          name: processed.name,
          cardHolderName: processed.cardHolderName || cleanFileNameToCardholderName(processed.name),
          frontCanvas: frontC,
          backCanvas: backC,
        });
      }

      setBatchProgress(Math.round(((i + 1) / batchItems.length) * 100));
    }

    if (!abortBatchRef.current) {
      setBatchItems(updated);
      const completedCount = updated.filter((it) => it.status === 'completed').length;
      if (completedCount > 0) {
        playCropSuccessSound();
      }

      // Automatically download & save all cropped cards with serial number and _F / _B
      if (exportPairs.length > 0) {
        await downloadBatchJpegs(exportPairs);
      }

      // Clear queue after auto crop is completed
      setTimeout(() => {
        setBatchItems([]);
        setIsBatchProcessing(false);
        setBatchProgress(0);
      }, 1000);
    } else {
      setBatchItems((prev) =>
        prev.map((it) => {
          const finished = updated.find((u) => u.id === it.id);
          if (finished) return finished;
          if (it.status === 'processing') return { ...it, status: 'pending' };
          return it;
        })
      );
      setIsBatchProcessing(false);
    }
  };

  // Handle Unlocking Protected PDF
  const handleUnlockPassword = async (password: string, rememberForBatch: boolean) => {
    setActivePdfPassword(password);
    if (rememberForBatch) {
      setSavedBatchPassword(password);
    }

    if (passwordModalItem) {
      if (passwordModalItem.id === 'temp_active' && currentFile) {
        // Active editor document
        await handleLoadFile(currentFile, password);
      } else {
        // Queue item
        const updatedItem = await processBatchItem({ ...passwordModalItem, password }, password);
        setBatchItems((prev) =>
          prev.map((it) => (it.id === passwordModalItem.id ? updatedItem : it))
        );
        if (updatedItem.status === 'completed') {
          playSingleCropSound();
        }
      }
    }
    setPasswordModalItem(null);
  };

  // Apply password directly to active loaded editor PDF
  const handleApplyActivePassword = async (password: string, rememberForBatch: boolean) => {
    setActivePdfPassword(password);
    if (rememberForBatch) {
      setSavedBatchPassword(password);
    }
    if (currentFile) {
      const res = await loadPdfAndRenderPage(currentFile, currentPage, password);
      if (res.success && res.page) {
        setSourceCanvas(res.page.canvas);
        setCurrentPage(res.page.pageNumber);
        setTotalPages(res.page.totalPdfPages);
      } else if (res.isPasswordRequired) {
        handleUnlockPassword(password, rememberForBatch);
      }
    }
  };

  // Apply master batch password to all queued items and auto-decrypt locked ones
  const handleApplyBatchPasswordToAll = async (password: string) => {
    setSavedBatchPassword(password);
    setActivePdfPassword(password);

    // Update all batch items with password
    const updatedItems = await Promise.all(
      batchItems.map(async (item) => {
        const itemWithPass = { ...item, password };
        if (item.status === 'password_required' || item.status === 'pending') {
          return await processBatchItem(itemWithPass, password);
        }
        return itemWithPass;
      })
    );
    setBatchItems(updatedItems);
    if (updatedItems.some(it => it.status === 'completed')) {
      playCropSuccessSound();
    }
  };

  // Change individual item password in batch table and optionally process/unlock
  const handleBatchItemPasswordChange = async (id: string, password: string, autoUnlock = false) => {
    const targetItem = batchItems.find((it) => it.id === id);
    if (!targetItem) return;

    const updatedWithPass: BatchItem = { ...targetItem, password };
    if (autoUnlock || targetItem.status === 'password_required') {
      const processed = await processBatchItem(updatedWithPass, password);
      setBatchItems((prev) => prev.map((it) => (it.id === id ? processed : it)));
      if (processed.status === 'completed') {
        playSingleCropSound();
      }
    } else {
      setBatchItems((prev) => prev.map((it) => (it.id === id ? updatedWithPass : it)));
    }
  };

  // Load 1-Click Test Sample Document
  const handleLoadSample = (type: DocumentType) => {
    const sampleCanvas = generateSampleDocumentCanvas(type);
    setSourceCanvas(sampleCanvas);
    setCurrentFileName(`Sample_${type.toUpperCase()}_Document.pdf`);
    setCurrentPage(1);
    setTotalPages(1);

    // Set corresponding preset if available
    const matchingPreset = getCombinedPresets().find(p => p.category === type || p.name.toLowerCase().includes(type)) || getCombinedPresets()[0];
    if (matchingPreset) {
      applyPreset(matchingPreset.id);
    }
    playSingleCropSound();
  };

  // Merge Separate Front & Back scans into a single high-resolution workspace canvas
  const handleLoadDualFiles = async (frontFile: File, backFile: File) => {
    try {
      let fCanvas: HTMLCanvasElement;
      let bCanvas: HTMLCanvasElement;

      // Render front file
      if (frontFile.type === 'application/pdf' || frontFile.name.toLowerCase().endsWith('.pdf')) {
        const res = await loadPdfAndRenderPage(frontFile, 1);
        fCanvas = res.page?.canvas || await loadImageToCanvas(frontFile);
      } else {
        fCanvas = await loadImageToCanvas(frontFile);
      }

      // Render back file
      if (backFile.type === 'application/pdf' || backFile.name.toLowerCase().endsWith('.pdf')) {
        const res = await loadPdfAndRenderPage(backFile, 1);
        bCanvas = res.page?.canvas || await loadImageToCanvas(backFile);
      } else {
        bCanvas = await loadImageToCanvas(backFile);
      }

      // Combine side-by-side on high-resolution canvas
      const margin = 40;
      const combinedWidth = fCanvas.width + bCanvas.width + margin * 3;
      const combinedHeight = Math.max(fCanvas.height, bCanvas.height) + margin * 2;

      const compositeCanvas = document.createElement('canvas');
      compositeCanvas.width = combinedWidth;
      compositeCanvas.height = combinedHeight;
      const ctx = compositeCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#1e293b'; // Slate dark backdrop
        ctx.fillRect(0, 0, combinedWidth, combinedHeight);

        // Draw Front Canvas on Left
        ctx.drawImage(fCanvas, margin, margin);

        // Draw Back Canvas on Right
        ctx.drawImage(bCanvas, margin * 2 + fCanvas.width, margin);

        // Draw Subtle Divider Line
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(margin + fCanvas.width + margin / 2, 20);
        ctx.lineTo(margin + fCanvas.width + margin / 2, combinedHeight - 20);
        ctx.stroke();
      }

      setSourceCanvas(compositeCanvas);
      setCurrentFileName(`${frontFile.name.replace(/\.[^/.]+$/, '')}_Merged_Dual.pdf`);
      setCurrentPage(1);
      setTotalPages(1);
      setIsDualSided(true);

      // Set front crop box on left, back crop box on right
      const frontXPct = Number(((margin / combinedWidth) * 100).toFixed(2));
      const frontYPct = Number(((margin / combinedHeight) * 100).toFixed(2));
      const frontWPct = Number(((fCanvas.width / combinedWidth) * 100).toFixed(2));
      const frontHPct = Number(((fCanvas.height / combinedHeight) * 100).toFixed(2));

      const backXPct = Number((((margin * 2 + fCanvas.width) / combinedWidth) * 100).toFixed(2));
      const backYPct = Number(((margin / combinedHeight) * 100).toFixed(2));
      const backWPct = Number(((bCanvas.width / combinedWidth) * 100).toFixed(2));
      const backHPct = Number(((bCanvas.height / combinedHeight) * 100).toFixed(2));

      setFrontBox({
        id: 'front',
        label: 'Front Side',
        x: frontXPct,
        y: frontYPct,
        width: frontWPct,
        height: frontHPct,
        color: '#10B981',
      });

      setBackBox({
        id: 'back',
        label: 'Back Side',
        x: backXPct,
        y: backYPct,
        width: backWPct,
        height: backHPct,
        color: '#3B82F6',
      });

      setSelectedPresetId('custom_dual');
      playSingleCropSound();
    } catch (err) {
      console.error('Error merging dual side files:', err);
    }
  };

  // Apply User-Saved Custom Template Layout
  const handleApplySavedTemplate = (template: CustomSavedTemplate) => {
    setIsDualSided(template.dualSided);

    if (template.frontPage) {
      setFrontPageNumber(template.frontPage);
    }
    if (template.backPage) {
      setBackPageNumber(template.backPage);
    }

    setFrontBox({
      id: 'front',
      label: 'Front Side',
      x: template.frontBox.x,
      y: template.frontBox.y,
      width: template.frontBox.width,
      height: template.frontBox.height,
      color: '#10B981',
    });

    if (template.dualSided && template.backBox) {
      setBackBox({
        id: 'back',
        label: 'Back Side',
        x: template.backBox.x,
        y: template.backBox.y,
        width: template.backBox.width,
        height: template.backBox.height,
        color: '#3B82F6',
      });
    } else {
      setBackBox(undefined);
    }
  };

  // Swap Front and Back Side Boxes
  const handleSwapSides = () => {
    if (!backBox || !isDualSided) return;
    const tempFront = { ...frontBox };
    const tempBack = { ...backBox };

    setFrontBox({
      ...tempFront,
      x: tempBack.x,
      y: tempBack.y,
      width: tempBack.width,
      height: tempBack.height,
    });

    setBackBox({
      ...tempBack,
      x: tempFront.x,
      y: tempFront.y,
      width: tempFront.width,
      height: tempFront.height,
    });
  };

  // Match Back Box Dimensions to Front Box
  const handleMatchDimensions = () => {
    if (!backBox || !isDualSided) return;
    setBackBox({
      ...backBox,
      width: frontBox.width,
      height: frontBox.height,
    });
  };

  // Toggle Dual Sided Mode
  const handleToggleDualSided = (dual: boolean) => {
    setIsDualSided(dual);
    if (dual && !backBox) {
      // Place default back box to right of front box or at bottom right
      const nextX = Math.min(100 - frontBox.width, frontBox.x + frontBox.width + 4);
      setBackBox({
        id: 'back',
        label: 'Back Side',
        x: nextX > 90 ? 51 : nextX,
        y: frontBox.y,
        width: frontBox.width,
        height: frontBox.height,
        color: '#3B82F6',
      });
    }
  };

  // Quick Position Presets for Selected Box
  const handleQuickPosition = (position: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right' | 'center') => {
    const isFront = activeBoxId === 'front';
    const targetW = 44;
    const targetH = 27.74; // Standard CR80 aspect

    let newX = 5;
    let newY = 68;

    if (position === 'bottom-left') {
      newX = 5;
      newY = 68;
    } else if (position === 'bottom-right') {
      newX = 51;
      newY = 68;
    } else if (position === 'top-left') {
      newX = 5;
      newY = 5;
    } else if (position === 'top-right') {
      newX = 51;
      newY = 5;
    } else if (position === 'center') {
      newX = 15;
      newY = 28;
    }

    if (isFront) {
      setFrontBox((prev) => ({
        ...prev,
        x: newX,
        y: newY,
        width: position === 'center' ? 70 : targetW,
        height: position === 'center' ? 44.1 : targetH,
      }));
    } else if (backBox) {
      setBackBox((prev) => prev ? ({
        ...prev,
        x: newX,
        y: newY,
        width: position === 'center' ? 70 : targetW,
        height: position === 'center' ? 44.1 : targetH,
      }) : undefined);
    }
  };

  // Page Rotate 90 degrees
  const handleRotatePage = () => {
    if (!sourceCanvas) return;
    const rotated = document.createElement('canvas');
    rotated.width = sourceCanvas.height;
    rotated.height = sourceCanvas.width;
    const ctx = rotated.getContext('2d');
    if (ctx) {
      ctx.translate(rotated.width / 2, rotated.height / 2);
      ctx.rotate((90 * Math.PI) / 180);
      ctx.drawImage(sourceCanvas, -sourceCanvas.width / 2, -sourceCanvas.height / 2);
      setSourceCanvas(rotated);
    }
  };

  // Single Card Exporters (JPEG format only with _F and _B naming, high resolution based on saveDpi)
  const handleExportFront = () => {
    const cardHolder = activeCardHolderName || cleanFileNameToCardholderName(currentFileName);
    if (sourceCanvas) {
      const exportCanvas = cropAndEnhanceRegion(sourceCanvas, frontBox, imageAdjustments, marginSettings, saveDpi);
      downloadCardSideJpeg(exportCanvas, cardHolder, 'F');
    } else if (frontPreviewCanvas) {
      downloadCardSideJpeg(frontPreviewCanvas, cardHolder, 'F');
    }
  };

  const handleExportBack = () => {
    const cardHolder = activeCardHolderName || cleanFileNameToCardholderName(currentFileName);
    if (backBox && sourceCanvas) {
      const exportCanvas = cropAndEnhanceRegion(sourceCanvas, backBox, imageAdjustments, marginSettings, saveDpi);
      downloadCardSideJpeg(exportCanvas, cardHolder, 'B');
    } else if (backPreviewCanvas) {
      downloadCardSideJpeg(backPreviewCanvas, cardHolder, 'B');
    }
  };

  const handleExportBothJpeg = () => {
    const cardHolder = activeCardHolderName || cleanFileNameToCardholderName(currentFileName);
    if (sourceCanvas) {
      const exportFront = cropAndEnhanceRegion(sourceCanvas, frontBox, imageAdjustments, marginSettings, saveDpi);
      const exportBack = isDualSided && backBox ? cropAndEnhanceRegion(sourceCanvas, backBox, imageAdjustments, marginSettings, saveDpi) : undefined;
      downloadCardBothSidesJpeg(exportFront, exportBack, cardHolder);
    } else if (frontPreviewCanvas) {
      downloadCardBothSidesJpeg(
        frontPreviewCanvas,
        isDualSided && backPreviewCanvas ? backPreviewCanvas : undefined,
        cardHolder
      );
    }
  };

  const handleExportPdf = () => {
    if (!frontPreviewCanvas) return;
    const cardHolder = activeCardHolderName || cleanFileNameToCardholderName(currentFileName);
    const exportFront = sourceCanvas ? cropAndEnhanceRegion(sourceCanvas, frontBox, imageAdjustments, marginSettings, saveDpi) : frontPreviewCanvas;
    const exportBack = isDualSided && backBox && sourceCanvas ? cropAndEnhanceRegion(sourceCanvas, backBox, imageAdjustments, marginSettings, saveDpi) : (isDualSided && backPreviewCanvas ? backPreviewCanvas : undefined);

    const pair: CardExportPair = {
      name: currentFileName.replace(/\.[^/.]+$/, ''),
      cardHolderName: cardHolder,
      frontCanvas: exportFront,
      backCanvas: exportBack,
    };
    const pdf = generatePrintPdf([pair], printSettings);
    pdf.save(`${sanitizeCardholderName(cardHolder)}_PVC_Card.pdf`);
  };

  // Batch Exporters
  const getCompletedCardPairs = (): CardExportPair[] => {
    const pairs: CardExportPair[] = [];
    const targetW = saveDpi === 600 ? 2022 : 1011;
    const targetH = saveDpi === 600 ? 1275 : 638;

    batchItems.forEach((item) => {
      if (item.status === 'completed' && item.frontCropUrl) {
        const frontImg = new Image();
        frontImg.src = item.frontCropUrl;
        const frontC = document.createElement('canvas');
        frontC.width = targetW;
        frontC.height = targetH;
        frontC.getContext('2d')?.drawImage(frontImg, 0, 0, frontC.width, frontC.height);

        let backC: HTMLCanvasElement | undefined = undefined;
        if (item.backCropUrl) {
          const backImg = new Image();
          backImg.src = item.backCropUrl;
          backC = document.createElement('canvas');
          backC.width = targetW;
          backC.height = targetH;
          backC.getContext('2d')?.drawImage(backImg, 0, 0, backC.width, backC.height);
        }

        pairs.push({
          name: item.name.replace(/\.[^/.]+$/, ''),
          cardHolderName: item.cardHolderName || cleanFileNameToCardholderName(item.name),
          frontCanvas: frontC,
          backCanvas: backC,
        });
      }
    });

    // If no batch items completed, use current editor card
    if (pairs.length === 0 && frontPreviewCanvas) {
      const cardHolder = activeCardHolderName || cleanFileNameToCardholderName(currentFileName);
      const exportFront = sourceCanvas ? cropAndEnhanceRegion(sourceCanvas, frontBox, imageAdjustments, marginSettings, saveDpi) : frontPreviewCanvas;
      const exportBack = isDualSided && backBox && sourceCanvas ? cropAndEnhanceRegion(sourceCanvas, backBox, imageAdjustments, marginSettings, saveDpi) : (isDualSided && backPreviewCanvas ? backPreviewCanvas : undefined);

      pairs.push({
        name: currentFileName.replace(/\.[^/.]+$/, ''),
        cardHolderName: cardHolder,
        frontCanvas: exportFront,
        backCanvas: exportBack,
      });
    }

    return pairs;
  };

  const handleDownloadAllJpegs = () => {
    const pairs = getCompletedCardPairs();
    if (pairs.length > 0) {
      downloadBatchJpegs(pairs);
    }
  };

  const handleDownloadItemJpegs = (item: BatchItem) => {
    if (!item.frontCropUrl) return;
    const targetW = saveDpi === 600 ? 2022 : 1011;
    const targetH = saveDpi === 600 ? 1275 : 638;

    const frontImg = new Image();
    frontImg.src = item.frontCropUrl;
    const frontC = document.createElement('canvas');
    frontC.width = targetW;
    frontC.height = targetH;
    frontC.getContext('2d')?.drawImage(frontImg, 0, 0, frontC.width, frontC.height);

    let backC: HTMLCanvasElement | undefined = undefined;
    if (item.backCropUrl) {
      const backImg = new Image();
      backImg.src = item.backCropUrl;
      backC = document.createElement('canvas');
      backC.width = targetW;
      backC.height = targetH;
      backC.getContext('2d')?.drawImage(backImg, 0, 0, backC.width, backC.height);
    }

    const itemIndex = batchItems.findIndex((b) => b.id === item.id);
    const serial = itemIndex >= 0 ? itemIndex + 1 : 1;
    const cardHolder = item.cardHolderName || cleanFileNameToCardholderName(item.name);
    downloadCardBothSidesJpeg(frontC, backC, cardHolder, 0.99, serial);
  };

  const handleDownloadMasterPdf = () => {
    const pairs = getCompletedCardPairs();
    if (pairs.length > 0) {
      const pdf = generatePrintPdf(pairs, printSettings);
      pdf.save(`Sayonika_PVC_Master_Print_${printSettings.layout}.pdf`);
    }
  };

  // Keyboard Shortcuts Hook (Ctrl+O, Ctrl+P, Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        hiddenFileInputRef.current?.click();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setActiveTab('print');
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleExportPdf();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [frontPreviewCanvas, backPreviewCanvas, isDualSided, printSettings, currentFileName]);

  // Unauthenticated: Show Firestore Live Auth Login Screen ONLY if public access is disabled
  if (!effectiveSession) {
    return (
      <InternetConnectionGuard>
        <LoginScreen
          onLoginSuccess={(session) => {
            setAuthSession(session);
            setLoginError(null);
          }}
          initialError={loginError}
          publicAccessEnabled={securityConfig.publicAccessEnabled}
          onEnterAsGuest={() => {
            setAuthSession(GUEST_PUBLIC_SESSION);
            setLoginError(null);
          }}
        />
      </InternetConnectionGuard>
    );
  }

  return (
    <InternetConnectionGuard>
      <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
        {/* Hidden file input for Ctrl+O and top button */}
      <input
        ref={hiddenFileInputRef}
        type="file"
        multiple
        accept=".pdf,.png,.jpg,.jpeg,.webp"
        onChange={(e) => e.target.files && handleFilesSelected(e.target.files)}
        className="hidden"
      />

      {/* Header with Titlebar and Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        batchCount={batchItems.length}
        onOpenFileClick={() => hiddenFileInputRef.current?.click()}
        onLoadSample={handleLoadSample}
        onOpenSampleModal={() => setIsSampleModalOpen(true)}
        onOpenAbout={() => setIsDeveloperModalOpen(true)}
        onOpenWelcomeBanner={() => setIsBroadcastPopupOpen(true)}
        onOpenCloudHub={() => {
          setPresetImportExportTab('cloud');
          setIsPresetImportExportModalOpen(true);
        }}
        onOpenPdfiumModal={() => setIsPdfiumModalOpen(true)}
        currentUser={effectiveSession}
        onOpenAdminLogin={() => setIsAdminLoginModalOpen(true)}
        onOpenUserManagement={() => {
          setUserManagementInitialTab('users');
          setIsUserManagementModalOpen(true);
        }}
        onOpenUserMessageModal={() => setIsUserMessageModalOpen(true)}
        onOpenAdminMessages={() => {
          setUserManagementInitialTab('messages');
          setIsUserManagementModalOpen(true);
        }}
        unreadMessagesCount={unreadUserMessagesCount}
        onOpenSubscriptionPayment={() => setIsSubscriptionPaymentModalOpen(true)}
        onOpenBroadcastEditor={() => setIsBroadcastEditorOpen(true)}
        publicAccessEnabled={securityConfig.publicAccessEnabled}
        onTogglePublicAccess={handleTogglePublicAccess}
        isTogglingPublicAccess={isTogglingPublicAccess}
        onLogout={handleLogout}
        onProcessAll={handleProcessAllBatch}
        onStopProcessing={handleStopBatchProcessing}
        isProcessing={isBatchProcessing}
        onOpenEpsonPrint={() => setIsEpsonPrintModalOpen(true)}
      />

      {/* Real-time Admin Template Push Broadcast Banner for Users */}
      {templatePushNotice && (
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-blue-900 border-b border-purple-500/40 px-4 py-2.5 flex items-center justify-between shadow-2xl animate-fade-in z-30">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-purple-500/20 text-purple-300 rounded-lg border border-purple-500/30">
              <Sparkles className="w-4 h-4 text-purple-300 animate-pulse" />
            </div>
            <p className="text-xs font-bold text-white tracking-wide">
              {templatePushNotice.message}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setTemplatePushNotice(null)}
            className="text-xs text-purple-200 hover:text-white px-2 py-1 rounded bg-purple-950/60 border border-purple-800 transition"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Workspace Body */}
      <main className="flex-1 min-h-0 flex overflow-hidden relative">
        {activeTab === 'editor' && (
          <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden">
            {/* Interactive Precision Canvas Editor */}
            <CanvasEditor
              sourceCanvas={sourceCanvas}
              frontBox={frontBox}
              backBox={backBox}
              activeBoxId={activeBoxId}
              isDualSided={isDualSided}
              lockAspectRatio={lockAspectRatio}
              currentPage={currentPage}
              totalPages={totalPages}
              frontPageNumber={frontPageNumber}
              backPageNumber={backPageNumber}
              isPasswordLocked={Boolean(passwordModalItem && passwordModalItem.id === 'temp_active')}
              lockedFileName={currentFileName}
              activePdfPassword={activePdfPassword}
              savedBatchPassword={savedBatchPassword}
              onUnlockPassword={(pass, rem) => handleUnlockPassword(pass, rem)}
              onApplyPdfPassword={handleApplyActivePassword}
              onOpenFileClick={() => hiddenFileInputRef.current?.click()}
              onEditActivePreset={() => {
                const preset = resolvePresetConfig(selectedPresetId) || DEFAULT_FALLBACK_PRESET;
                setEditingPreset(preset);
                setIsEditPresetModalOpen(true);
              }}
              onFrontPageChange={async (page) => {
                setFrontPageNumber(page);
                if (currentFile && currentPage !== page) {
                  const res = await loadPdfAndRenderPage(currentFile, page, activePdfPassword || savedBatchPassword);
                  if (res.success && res.page) {
                    setSourceCanvas(res.page.canvas);
                    setCurrentPage(res.page.pageNumber);
                  }
                }
              }}
              onBackPageChange={async (page) => {
                setBackPageNumber(page);
                if (currentFile && currentPage !== page) {
                  const res = await loadPdfAndRenderPage(currentFile, page, activePdfPassword || savedBatchPassword);
                  if (res.success && res.page) {
                    setSourceCanvas(res.page.canvas);
                    setCurrentPage(res.page.pageNumber);
                  }
                }
              }}
              onSetCurrentPageAsFront={() => setFrontPageNumber(currentPage)}
              onSetCurrentPageAsBack={() => setBackPageNumber(currentPage)}
              onBoxChange={(box) => {
                if (box.id === 'front') setFrontBox(box);
                else setBackBox(box);
              }}
              onActiveBoxChange={async (id) => {
                setActiveBoxId(id);
                const targetPage = id === 'front' ? frontPageNumber : backPageNumber;
                if (currentFile && targetPage !== currentPage) {
                  const res = await loadPdfAndRenderPage(currentFile, targetPage, activePdfPassword || savedBatchPassword);
                  if (res.success && res.page) {
                    setSourceCanvas(res.page.canvas);
                    setCurrentPage(res.page.pageNumber);
                  }
                }
              }}
              onToggleDualSided={handleToggleDualSided}
              onSwapSides={handleSwapSides}
              onMatchDimensions={handleMatchDimensions}
              onOpenSaveTemplate={() => setIsSaveTemplateModalOpen(true)}
              onToggleLockAspectRatio={() => setLockAspectRatio((prev) => !prev)}
              onPageChange={async (page) => {
                if (currentFile) {
                  const res = await loadPdfAndRenderPage(currentFile, page, activePdfPassword || savedBatchPassword);
                  if (res.success && res.page) {
                    setSourceCanvas(res.page.canvas);
                    setCurrentPage(res.page.pageNumber);
                  }
                }
              }}
              onRotatePage={handleRotatePage}
            />

            {/* Sidebar Controls & Real-Time CR80 Previews */}
            <SidebarControls
              selectedPresetId={selectedPresetId}
              marginSettings={marginSettings}
              imageAdjustments={imageAdjustments}
              frontPreviewCanvas={frontPreviewCanvas}
              backPreviewCanvas={backPreviewCanvas}
              isDualSided={isDualSided}
              activeBoxId={activeBoxId}
              totalPages={totalPages}
              currentPage={currentPage}
              frontPageNumber={frontPageNumber}
              backPageNumber={backPageNumber}
              isPasswordLocked={Boolean(passwordModalItem && passwordModalItem.id === 'temp_active')}
              activePdfPassword={activePdfPassword}
              savedBatchPassword={savedBatchPassword}
              onApplyPdfPassword={handleApplyActivePassword}
              onFrontPageChange={async (page) => {
                setFrontPageNumber(page);
                if (currentFile && currentPage !== page) {
                  const res = await loadPdfAndRenderPage(currentFile, page, activePdfPassword || savedBatchPassword);
                  if (res.success && res.page) {
                    setSourceCanvas(res.page.canvas);
                    setCurrentPage(res.page.pageNumber);
                  }
                }
              }}
              onBackPageChange={async (page) => {
                setBackPageNumber(page);
                if (currentFile && currentPage !== page) {
                  const res = await loadPdfAndRenderPage(currentFile, page, activePdfPassword || savedBatchPassword);
                  if (res.success && res.page) {
                    setSourceCanvas(res.page.canvas);
                    setCurrentPage(res.page.pageNumber);
                  }
                }
              }}
              onSetPageLayoutPreset={async (mode) => {
                if (mode === 'p1_front_p2_back') {
                  setFrontPageNumber(1);
                  setBackPageNumber(Math.min(2, totalPages));
                } else if (mode === 'both_p1') {
                  setFrontPageNumber(1);
                  setBackPageNumber(1);
                } else if (mode === 'both_current') {
                  setFrontPageNumber(currentPage);
                  setBackPageNumber(currentPage);
                } else if (mode === 'swap_pages') {
                  const temp = frontPageNumber;
                  setFrontPageNumber(backPageNumber);
                  setBackPageNumber(temp);
                }
              }}
              onActiveBoxChange={async (id) => {
                setActiveBoxId(id);
                const targetPage = id === 'front' ? frontPageNumber : backPageNumber;
                if (currentFile && targetPage !== currentPage) {
                  const res = await loadPdfAndRenderPage(currentFile, targetPage, activePdfPassword || savedBatchPassword);
                  if (res.success && res.page) {
                    setSourceCanvas(res.page.canvas);
                    setCurrentPage(res.page.pageNumber);
                  }
                }
              }}
              cardHolderName={activeCardHolderName}
              onCardHolderNameChange={setActiveCardHolderName}
              onToggleDualSided={handleToggleDualSided}
              onSwapSides={handleSwapSides}
              onMatchDimensions={handleMatchDimensions}
              onQuickPosition={handleQuickPosition}
              onOpenSampleModal={() => setIsSampleModalOpen(true)}
              onOpenSaveTemplate={() => setIsSaveTemplateModalOpen(true)}
              onOpenPresetImportExport={(tab) => {
                setPresetImportExportTab(tab || 'export');
                setIsPresetImportExportModalOpen(true);
              }}
              onEditActivePreset={() => {
                const preset = resolvePresetConfig(selectedPresetId) || DEFAULT_FALLBACK_PRESET;
                setEditingPreset(preset);
                setIsEditPresetModalOpen(true);
              }}
              onSelectPreset={applyPreset}
              onMarginSettingsChange={setMarginSettings}
              onImageAdjustmentsChange={setImageAdjustments}
              onExportFront={handleExportFront}
              onExportBack={handleExportBack}
              onExportBothJpeg={handleExportBothJpeg}
              onExportPdf={handleExportPdf}
              onSendToPrintStudio={() => setActiveTab('print')}
              onOpenEpsonPrint={() => setIsEpsonPrintModalOpen(true)}
              saveDpi={saveDpi}
              onSaveDpiChange={setSaveDpi}
            />
          </div>
        )}

        {activeTab === 'batch' && (
          <BatchProcessingView
            items={batchItems}
            isProcessing={isBatchProcessing}
            progressPercent={batchProgress}
            autoSaveEnabled={autoSaveEnabled}
            saveDpi={saveDpi}
            onSaveDpiChange={setSaveDpi}
            savedBatchPassword={savedBatchPassword}
            onSavedBatchPasswordChange={setSavedBatchPassword}
            onApplyBatchPasswordToAll={handleApplyBatchPasswordToAll}
            onItemPasswordChange={handleBatchItemPasswordChange}
            onItemNameChange={(id, name) => {
              setBatchItems((prev) =>
                prev.map((it) => (it.id === id ? { ...it, cardHolderName: name } : it))
              );
            }}
            marginSettings={marginSettings}
            imageAdjustments={imageAdjustments}
            printSettings={printSettings}
            onFilesSelected={handleFilesSelected}
            onRemoveItem={(id) => setBatchItems((prev) => prev.filter((i) => i.id !== id))}
            onClearAll={() => setBatchItems([])}
            onProcessAll={handleProcessAllBatch}
            onStopProcessing={handleStopBatchProcessing}
            onItemPageChange={(id, frontPage, backPage) => {
              setBatchItems((prev) =>
                prev.map((it) =>
                  it.id === id
                    ? {
                        ...it,
                        frontPageNumber: frontPage,
                        backPageNumber: backPage,
                        status: 'pending',
                      }
                    : it
                )
              );
            }}
            onPresetChange={(id, presetId) => {
              const preset = resolvePresetConfig(presetId) || DEFAULT_FALLBACK_PRESET;
              setBatchItems((prev) =>
                prev.map((it) =>
                  it.id === id
                    ? {
                        ...it,
                        presetId: preset.id,
                        docType: preset.category,
                        frontPageNumber: preset.frontPage || 1,
                        backPageNumber: preset.backPage || 2,
                        frontBox: {
                          id: 'front',
                          label: 'Front Side',
                          x: preset.frontBox.x,
                          y: preset.frontBox.y,
                          width: preset.frontBox.width,
                          height: preset.frontBox.height,
                          color: '#10B981',
                        },
                        backBox: preset.backBox
                          ? {
                              id: 'back',
                              label: 'Back Side',
                              x: preset.backBox.x,
                              y: preset.backBox.y,
                              width: preset.backBox.width,
                              height: preset.backBox.height,
                              color: '#3B82F6',
                            }
                          : undefined,
                      }
                    : it
                )
              );
            }}
            onSetAllPagesP1P2={() => {
              setBatchItems((prev) =>
                prev.map((it) => ({
                  ...it,
                  frontPageNumber: 1,
                  backPageNumber: 2,
                  status: it.status === 'completed' ? 'pending' : it.status,
                }))
              );
            }}
            onEditInCanvas={async (item) => {
              await handleLoadFile(item.file, item.password || savedBatchPassword);
              setActiveTab('editor');
            }}
            onUnlockPassword={(item) => setPasswordModalItem(item)}
            onToggleAutoSave={setAutoSaveEnabled}
            onDownloadAllZip={handleDownloadAllJpegs}
            onDownloadItemJpegs={handleDownloadItemJpegs}
            onDownloadMasterPdf={handleDownloadMasterPdf}
            onOpenPrintStudio={() => setActiveTab('print')}
            onOpenEpsonPrint={() => setIsEpsonPrintModalOpen(true)}
          />
        )}

        {activeTab === 'print' && (
          <PrintStudioModal
            cardPairs={getCompletedCardPairs()}
            printSettings={printSettings}
            onPrintSettingsChange={setPrintSettings}
          />
        )}

        {activeTab === 'guide' && (
          <PresetsGuideView
            currentFrontBox={frontBox}
            currentBackBox={backBox}
            currentUser={effectiveSession}
            onSelectAndCrop={(presetId, docType) => {
              applyPreset(presetId);
              handleLoadSample(docType);
              setActiveTab('editor');
            }}
          />
        )}
      </main>

      {/* Sample Template & Dual File Upload Modal */}
      <SampleTemplateModal
        isOpen={isSampleModalOpen}
        onClose={() => setIsSampleModalOpen(false)}
        onLoadSample={(type) => {
          handleLoadSample(type);
          setActiveTab('editor');
        }}
        onLoadCustomFile={(file) => {
          handleLoadFile(file);
          setActiveTab('editor');
        }}
        onLoadDualFiles={(f, b) => {
          handleLoadDualFiles(f, b);
          setActiveTab('editor');
        }}
        onApplySavedTemplate={(tpl) => {
          handleApplySavedTemplate(tpl);
          setActiveTab('editor');
        }}
        onOpenImportExportModal={(tab) => {
          setPresetImportExportTab(tab || 'export');
          setIsPresetImportExportModalOpen(true);
        }}
        currentFrontBox={frontBox}
        currentBackBox={backBox}
        currentIsDualSided={isDualSided}
      />

      {/* Preset Import / Export Management Modal */}
      <PresetImportExportModal
        isOpen={isPresetImportExportModalOpen}
        initialTab={presetImportExportTab}
        currentUser={effectiveSession}
        onClose={() => setIsPresetImportExportModalOpen(false)}
        onPresetsUpdated={() => {
          // Re-trigger presets check if active preset was modified or added
          applyPreset(selectedPresetId);
        }}
      />

      {/* Password Decryption Modal */}
      {passwordModalItem && (
        <PasswordModal
          item={passwordModalItem}
          onUnlock={handleUnlockPassword}
          onClose={() => setPasswordModalItem(null)}
        />
      )}

      {/* Developer Attribution & Contact Modal */}
      {isDeveloperModalOpen && (
        <DeveloperModal 
          onClose={() => setIsDeveloperModalOpen(false)} 
          onOpenWelcomeBanner={() => setIsBroadcastPopupOpen(true)}
        />
      )}

      {/* Customizable Pop-up Message / Broadcast Announcement Modal */}
      <BroadcastPopupModal
        isOpen={isBroadcastPopupOpen && broadcastConfig.isEnabled}
        onClose={() => setIsBroadcastPopupOpen(false)}
        config={broadcastConfig}
        authSession={effectiveSession}
        onOpenEditor={() => setIsBroadcastEditorOpen(true)}
      />

      {/* Admin: Pop-up Message Manager & Customizer Modal */}
      {isBroadcastEditorOpen && effectiveSession?.role === 'admin' && (
        <BroadcastEditorModal
          isOpen={isBroadcastEditorOpen}
          onClose={() => setIsBroadcastEditorOpen(false)}
          currentConfig={broadcastConfig}
          authSession={effectiveSession}
          onConfigSaved={(saved) => {
            setBroadcastConfig(saved);
          }}
        />
      )}

      {/* Manual Save Crop as Reusable Auto-Crop Template Modal */}
      <SaveTemplateModal
        isOpen={isSaveTemplateModalOpen}
        onClose={() => setIsSaveTemplateModalOpen(false)}
        frontBox={frontBox}
        backBox={backBox}
        isDualSided={isDualSided}
        totalPages={totalPages}
        frontPageNumber={frontPageNumber}
        backPageNumber={backPageNumber}
        marginSettings={marginSettings}
        imageAdjustments={imageAdjustments}
        currentFileName={currentFileName}
        currentUser={effectiveSession}
        onTemplateSaved={(newTpl) => {
          setSelectedPresetId(`custom_tpl_${newTpl.id}`);
        }}
      />

      {/* Preset Customization & Coordinate Editor Modal */}
      <EditPresetModal
        isOpen={isEditPresetModalOpen}
        preset={editingPreset}
        currentFrontBox={frontBox}
        currentBackBox={backBox}
        currentUser={effectiveSession}
        onClose={() => setIsEditPresetModalOpen(false)}
        onPresetSaved={(updated) => {
          applyPreset(updated.id);
        }}
        onPresetDeleted={(deletedId) => {
          if (selectedPresetId === deletedId || selectedPresetId === `custom_tpl_${deletedId}`) {
            const remaining = getCombinedPresets();
            applyPreset(remaining[0]?.id || DEFAULT_FALLBACK_PRESET.id);
          }
        }}
      />

      {/* User Login & Authorization Management Modal */}
      <UserManagementModal
        isOpen={isUserManagementModalOpen}
        onClose={() => setIsUserManagementModalOpen(false)}
        currentUserId={effectiveSession?.userId || ''}
        initialTab={userManagementInitialTab}
      />

      {/* User Support & Inquiries Modal (Message to Admin) */}
      <UserMessageAdminModal
        isOpen={isUserMessageModalOpen}
        onClose={() => setIsUserMessageModalOpen(false)}
        authSession={effectiveSession}
      />

      {/* Subscription Plans & Instant UPI Payment Modal */}
      <SubscriptionPaymentModal
        isOpen={isSubscriptionPaymentModalOpen}
        onClose={() => setIsSubscriptionPaymentModalOpen(false)}
        prefillUserId={effectiveSession?.userId}
        prefillUserName={effectiveSession?.name}
        onOpenMessageAdmin={() => setIsUserMessageModalOpen(true)}
      />

      {/* Admin Sign In Modal (Accessible from Header in Public Access Mode) */}
      <AdminLoginModal
        isOpen={isAdminLoginModalOpen}
        onClose={() => setIsAdminLoginModalOpen(false)}
        onLoginSuccess={(session) => {
          setAuthSession(session);
          setLoginError(null);
        }}
      />

      {/* Epson Photo+ / L8050 / L18050 Direct PVC Tray Borderless Print Modal */}
      {isEpsonPrintModalOpen && (
        <EpsonPhotoPlusModal
          cardPairs={getCompletedCardPairs()}
          printSettings={printSettings}
          onClose={() => setIsEpsonPrintModalOpen(false)}
        />
      )}

      {/* Google PDFium WebAssembly Engine Studio & Diagnostic Inspector */}
      <PDFiumEngineModal
        isOpen={isPdfiumModalOpen}
        onClose={() => setIsPdfiumModalOpen(false)}
      />
      </div>
    </InternetConnectionGuard>
  );
}

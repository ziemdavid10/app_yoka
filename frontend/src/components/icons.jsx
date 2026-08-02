/**
 * Mapping centralisé : noms Material Symbols → composants react-icons
 * Bibliothèques utilisées :
 *   md  → Material Design  (react-icons/md)
 *   hi2 → Heroicons v2     (react-icons/hi2)
 *   bi  → Bootstrap Icons  (react-icons/bi)
 */
import {
  MdInsights, MdBarChart, MdSchool, MdCorporateFare, MdAssignmentInd, MdPayments,
  MdAutoStories, MdDashboard, MdApartment, MdManageAccounts, MdCalendarMonth,
  MdShield, MdSettings, MdSecurity, MdAdminPanelSettings,
  MdAdd, MdEdit, MdDelete, MdClose, MdSave, MdMenu, MdLogout,
  MdWarning, MdError, MdCheckCircle, MdInfo,
  MdPerson, MdPersonAdd, MdPersonOff, MdPersonRemove, MdGroups,
  MdLock, MdKey, MdVisibility, MdVisibilityOff,
  MdLogin, MdRefresh, MdContentCopy, MdUpload, MdUploadFile, MdFileDownload,
  MdPictureAsPdf, MdPrint, MdOutput,
  MdAccountBalanceWallet, MdSavings, MdTrendingDown, MdMoneyOff, MdAccountBalance,
  MdReceiptLong, MdPointOfSale, MdMenuBook, MdPayment,
  MdArrowCircleUp, MdArrowCircleDown,
  MdFactCheck, MdHowToReg, MdTaskAlt, MdAssignment,
  MdDomain, MdAddBusiness,
  MdAnalytics,
  MdCelebration, MdForum, MdNotifications,
  MdFirstPage, MdLastPage, MdChevronLeft, MdChevronRight,
  MdAutorenew, MdSync,
  MdTune, MdRadioButtonChecked, MdRemove,
  MdEventAvailable, MdBlock, MdDeleteForever,
  MdBackup,
  MdNavigateNext, MdNavigateBefore,
  MdAccountTree, MdInbox,
} from 'react-icons/md';

const ICON_MAP = {
  // Navigation
  monitoring:        MdInsights,
  school:            MdSchool,
  corporate_fare:    MdCorporateFare,
  assignment_ind:    MdAssignmentInd,
  payments:          MdPayments,
  dashboard:         MdDashboard,
  apartment:         MdApartment,
  manage_accounts:   MdManageAccounts,
  calendar_month:    MdCalendarMonth,
  shield:            MdShield,
  settings:          MdSettings,
  shield_person:     MdAdminPanelSettings,

  // Marque / Logo
  auto_stories:      MdAutoStories,

  // Actions CRUD
  add:               MdAdd,
  edit:              MdEdit,
  delete:            MdDelete,
  close:             MdClose,
  save:              MdSave,
  menu:              MdMenu,
  logout:            MdLogout,
  remove:            MdRemove,

  // Statuts / Alertes
  warning:           MdWarning,
  error:             MdError,
  check_circle:      MdCheckCircle,
  info:              MdInfo,
  celebration:       MdCelebration,
  block:             MdBlock,
  delete_forever:    MdDeleteForever,

  // Personnes
  person:            MdPerson,
  person_add:        MdPersonAdd,
  person_off:        MdPersonOff,
  person_remove:     MdPersonRemove,
  groups:            MdGroups,
  how_to_reg:        MdHowToReg,

  // Sécurité / Auth
  lock:              MdLock,
  key:               MdKey,
  security:          MdSecurity,
  visibility:        MdVisibility,
  visibility_off:    MdVisibilityOff,
  login:             MdLogin,

  // Fichiers / Export
  upload:            MdUpload,
  upload_file:       MdUploadFile,
  file_download:     MdFileDownload,
  picture_as_pdf:    MdPictureAsPdf,
  print:             MdPrint,
  output:            MdOutput,
  content_copy:      MdContentCopy,

  // Finance / Caisse
  account_balance_wallet: MdAccountBalanceWallet,
  savings:           MdSavings,
  trending_down:     MdTrendingDown,
  money_off:         MdMoneyOff,
  account_balance:   MdAccountBalance,
  receipt_long:      MdReceiptLong,
  point_of_sale:     MdPointOfSale,
  menu_book:         MdMenuBook,
  payment:           MdPayment,
  arrow_circle_up:   MdArrowCircleUp,
  arrow_circle_down: MdArrowCircleDown,

  // Inscriptions / Classes
  fact_check:        MdFactCheck,
  task_alt:          MdTaskAlt,
  assignment:        MdAssignment,
  domain:            MdDomain,
  add_business:      MdAddBusiness,
  account_tree:      MdAccountTree,

  // Graphiques
  analytics:         MdAnalytics,

  // Communication
  forum:             MdForum,
  notifications:     MdNotifications,

  // Pagination
  first_page:        MdFirstPage,
  last_page:         MdLastPage,
  chevron_left:      MdChevronLeft,
  chevron_right:     MdChevronRight,

  // Chargement / Refresh
  progress_activity: MdSync,
  refresh:           MdRefresh,
  autorenew:         MdAutorenew,

  // Config tranches
  tune:              MdTune,
  radio_button_checked: MdRadioButtonChecked,

  // Année académique
  event_available:   MdEventAvailable,

  // Sauvegarde
  backup:            MdBackup,

  // Divers
  inbox:             MdInbox,
  navigate_next:     MdNavigateNext,
  navigate_before:   MdNavigateBefore,
  event:             MdCalendarMonth,
};

/**
 * Composant Icon universel — remplace <span className="material-symbols-outlined">
 * Usage : <Icon name="delete" size={20} style={{ color: 'red' }} />
 */
const Icon = ({ name, style = {}, size = 20, className = '' }) => {
  const Component = ICON_MAP[name];
  if (!Component) {
    // Fallback visible en dev si une icône est manquante
    if (import.meta.env.DEV) console.warn(`[Icon] icône inconnue : "${name}"`);
    return null;
  }
  return <Component size={size} style={style} className={className} />;
};

export default Icon;

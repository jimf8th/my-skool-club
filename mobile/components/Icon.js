// Single icon system for the app: renders Lucide icons everywhere, but keeps
// the drop-in `<MaterialCommunityIcons name="..." size={} color={} />` API so
// existing call sites (and react-native-paper's `icon="name"` props, wired up
// via the PaperProvider `settings.icon` override) don't need to change.
import React from 'react';
import { MaterialCommunityIcons as ExpoMaterialCommunityIcons } from '@expo/vector-icons';
import {
  Home, School, Users, User, Heart, ArrowRight, ArrowUpRight, ArrowLeft, MapPin, Megaphone,
  ChevronRight, ChevronLeft, Check, CheckCircle2, XCircle, X, LogOut, Search, UserSearch,
  Plus, Lock, Trash2, Pencil, UserPlus, UserMinus, Clock, ShieldCheck, Shield, LayoutDashboard,
  UserCheck, Receipt, Package, CircleDollarSign, Calendar, CalendarCheck, Flag, Inbox,
  AlertTriangle, Star, Circle, MailWarning, MailCheck, Camera, Mail, Eye, EyeOff, Info,
  LifeBuoy, ScrollText, BarChart3, UserCog, KeyRound, HelpCircle,
} from 'lucide-react-native';

// Maps MaterialCommunityIcons name strings (as used throughout the app and by
// react-native-paper) to the equivalent Lucide icon component.
const ICON_MAP = {
  'arrow-right': ArrowRight,
  'arrow-up-right': ArrowUpRight,
  'arrow-left': ArrowLeft,
  'map-marker-outline': MapPin,
  'bullhorn-outline': Megaphone,
  'bullhorn': Megaphone,
  'chevron-right': ChevronRight,
  'chevron-left': ChevronLeft,
  'school-outline': School,
  'school': School,
  'heart': Heart,
  'account-group': Users,
  'account-group-outline': Users,
  'account-multiple': Users,
  'account-multiple-outline': Users,
  'account-multiple-check-outline': UserCheck,
  'check': Check,
  'check-circle': CheckCircle2,
  'close-circle-outline': XCircle,
  'close': X,
  'logout': LogOut,
  'home': Home,
  'home-outline': Home,
  'calendar-star': CalendarCheck,
  'calendar-check': CalendarCheck,
  'calendar-heart': Calendar,
  'calendar-blank-outline': Calendar,
  'calendar': Calendar,
  'account': User,
  'magnify': Search,
  'account-search-outline': UserSearch,
  'plus': Plus,
  'lock-outline': Lock,
  'lock': Lock,
  'lock-check': Lock,
  'trash-can-outline': Trash2,
  'delete-outline': Trash2,
  'pencil-outline': Pencil,
  'account-plus-outline': UserPlus,
  'account-minus-outline': UserMinus,
  'account-remove-outline': UserMinus,
  'clock-outline': Clock,
  'account-clock-outline': Clock,
  'cash-clock': Clock,
  'cash-check': CircleDollarSign,
  'shield-account': ShieldCheck,
  'shield-account-outline': ShieldCheck,
  'shield-check': ShieldCheck,
  'shield-check-outline': Shield,
  'view-dashboard-outline': LayoutDashboard,
  'receipt-text-outline': Receipt,
  'package-variant-closed': Package,
  'flag-outline': Flag,
  'inbox-outline': Inbox,
  'alert-outline': AlertTriangle,
  'star-circle': Star,
  'circle-outline': Circle,
  'circle-small': Circle,
  'email-alert-outline': MailWarning,
  'email-check': MailCheck,
  'camera-outline': Camera,
  'email': Mail,
  'email-outline': Mail,
  'eye': Eye,
  'eye-off': EyeOff,
  'information-outline': Info,
  'help-circle-outline': LifeBuoy,
  'file-document-outline': ScrollText,
  'chart-box-outline': BarChart3,
  'account-cog': UserCog,
  'account-key': KeyRound,
};
// Official brand marks: keep the real MaterialCommunityIcons glyph instead of
// a generic Lucide substitute so social sign-in buttons stay recognizable.
const BRAND_PASSTHROUGH = new Set(['apple', 'google']);

export function MaterialCommunityIcons({ name, size = 24, color, style, ...rest }) {
  if (BRAND_PASSTHROUGH.has(name)) {
    return <ExpoMaterialCommunityIcons name={name} size={size} color={color} style={style} {...rest} />;
  }
  const LucideIcon = ICON_MAP[name] || HelpCircle;
  return <LucideIcon size={size} color={color} strokeWidth={2} style={style} {...rest} />;
}

export default MaterialCommunityIcons;

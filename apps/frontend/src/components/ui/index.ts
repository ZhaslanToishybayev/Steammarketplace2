// UI Components Library
// Unified exports using shadcn/ui components + custom components

// ============================================
// shadcn/ui Components
// ============================================
export { Button, buttonVariants } from './button';
export { Badge, badgeVariants, StatusBadge, RarityBadge } from './badge';
export {
    Dialog,
    DialogPortal,
    DialogOverlay,
    DialogClose,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription
} from './dialog';
export {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuCheckboxItem,
    DropdownMenuRadioItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuGroup,
    DropdownMenuPortal,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuRadioGroup,
} from './dropdown-menu';
export {
    Sheet,
    SheetPortal,
    SheetOverlay,
    SheetTrigger,
    SheetClose,
    SheetContent,
    SheetHeader,
    SheetFooter,
    SheetTitle,
    SheetDescription,
} from './sheet';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';
export { Avatar, AvatarImage, AvatarFallback } from './avatar';
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './tooltip';
export {
    Command,
    CommandDialog,
    CommandInput,
    CommandList,
    CommandEmpty,
    CommandGroup,
    CommandItem,
    CommandShortcut,
    CommandSeparator,
} from './command';
export { Toaster as SonnerToaster } from './sonner';

// ============================================
// Custom Components
// ============================================
export { Card, CardHeader, CardContent, CardFooter, CardDescription, CardTitle } from './Card';
export { Input, SearchInput } from './Input';
export { Skeleton, ItemCardSkeleton, TableRowSkeleton, ProfileSkeleton, StatsSkeleton } from './Skeleton';
export { FloatBar, FloatDisplay } from './FloatBar';
export { ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription, ToastClose, ToastAction } from './Toast';
export { LazyLoad, LazyGrid, LazyImage } from './LazyLoad';
export { LoadingOverlay, LoadingButton, PageLoader, InventoryGridSkeleton, SuccessAnimation } from './LoadingComponents';
export { ConfirmModal } from './ConfirmModal';
export { AnimatedCounter } from './AnimatedCounter';
export { SteamLoginButton } from './SteamLoginButton';

// Backward compatibility aliases
export { Dialog as Modal, DialogContent as ModalContent } from './dialog';
export { Sheet as Drawer, SheetContent as DrawerContent } from './sheet';

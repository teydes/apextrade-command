import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Search } from 'lucide-react';
import { NAV_GROUPS } from '@/components/layout/Sidebar';

export default function CommandPalette({ open, onOpenChange }) {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenChange(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onOpenChange]);

  const flatCount = NAV_GROUPS.reduce((s, g) => s + g.items.length, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden sm:max-w-xl top-[15%] translate-y-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Recherche globale</DialogTitle>
        </DialogHeader>
        <Command>
          <div className="flex items-center border-b border-border px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput placeholder={`Rechercher parmi ${flatCount}+ modules...`} className="border-0 focus:ring-0 h-12" />
          </div>
          <CommandList className="max-h-[60vh]">
            <CommandEmpty>Aucun module trouvé.</CommandEmpty>
            {NAV_GROUPS.map(group => (
              <CommandGroup key={group.label} heading={group.label}>
                {group.items.map(item => {
                  const Icon = item.icon;
                  return (
                    <CommandItem
                      key={item.path}
                      value={`${item.label} ${group.label} ${item.path}`}
                      onSelect={() => { onOpenChange(false); navigate(item.path); }}
                    >
                      <Icon className="mr-2 h-4 w-4 text-primary" />
                      <span>{item.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
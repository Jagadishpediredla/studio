
"use client";
import * as React from "react";
import { ChevronRight, Folder } from "lucide-react";
import { cn } from "@/lib/utils";

interface TreeViewContextProps {
  selectedId: string | null;
  select: (id: string) => void;
}

const TreeViewContext = React.createContext<TreeViewContextProps>({
  selectedId: null,
  select: () => {},
});

interface TreeViewProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}

export function TreeView({ children, className, ...props }: TreeViewProps) {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const select = (id: string) => {
    setSelectedId(id);
  };

  return (
    <TreeViewContext.Provider value={{ selectedId, select }}>
      <div className={cn("space-y-1", className)} {...props}>
        {children}
      </div>
    </TreeViewContext.Provider>
  );
}


interface TreeViewItemProps {
  value: string;
  label: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export function TreeViewItem({ value, label, icon, children }: TreeViewItemProps) {
  const { selectedId, select } = React.useContext(TreeViewContext);
  const [isOpen, setIsOpen] = React.useState(false);

  const isSelected = selectedId === value;
  const hasChildren = React.Children.count(children) > 0;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if(hasChildren) {
      setIsOpen((prev) => !prev);
    }
  };
  
  const handleClick = (e: React.MouseEvent) => {
     e.stopPropagation();
     select(value);
     if (hasChildren) {
       setIsOpen((prev) => !prev);
     }
  }

  return (
    <div>
      <div
        onClick={handleClick}
        className={cn(
          "flex items-center py-1.5 px-2 rounded-md cursor-pointer transition-colors duration-100",
          isSelected ? "bg-accent text-accent-foreground" : "hover:bg-muted"
        )}
      >
        {hasChildren && (
          <ChevronRight
            onClick={handleToggle}
            className={cn(
              "h-4 w-4 mr-2 transition-transform duration-200",
              isOpen && "rotate-90"
            )}
          />
        )}
        <div className="flex items-center gap-2 flex-grow">
          {icon ? React.cloneElement(icon as React.ReactElement, { className: "h-4 w-4" }) : hasChildren ? <Folder className="h-4 w-4" /> : <div className="w-4" />}
          <span className="text-sm truncate">{label}</span>
        </div>
      </div>
      {isOpen && hasChildren && (
        <div className="pl-6 border-l border-muted-foreground/20 ml-[7px]">
          {children}
        </div>
      )}
    </div>
  );
}

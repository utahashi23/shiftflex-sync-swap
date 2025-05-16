
import { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Search } from 'lucide-react';

interface SearchFilterProps {
  placeholder?: string;
  onFilterChange: (value: string) => void;
}

export const SearchFilter: React.FC<SearchFilterProps> = ({ 
  placeholder = "Search...", 
  onFilterChange 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    onFilterChange(value);
  };
  
  return (
    <div className="relative w-full max-w-sm">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
      <Input
        type="search"
        placeholder={placeholder}
        value={searchTerm}
        onChange={handleSearchChange}
        className="pl-8 w-full"
      />
    </div>
  );
};

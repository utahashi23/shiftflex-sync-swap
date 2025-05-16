
import * as React from "react";
import { ensureSelectValue, generateSelectItemValue } from "@/utils/form-utils";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SafeSelectProps = React.ComponentProps<typeof Select> & {
  label?: string;
  options: Array<{ value?: string | null; label: string }>;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  value?: string;
};

export const SafeSelect = ({
  label,
  options,
  placeholder = "Select an option",
  className,
  disabled = false,
  onValueChange,
  defaultValue,
  value,
  ...props
}: SafeSelectProps) => {
  // Ensure we have a safe value if one is provided
  const safeValue = value ? ensureSelectValue(value) : undefined;
  const safeDefaultValue = defaultValue ? ensureSelectValue(defaultValue) : undefined;
  
  return (
    <Select
      defaultValue={safeDefaultValue}
      value={safeValue}
      onValueChange={onValueChange}
      disabled={disabled}
      {...props}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {label && <SelectLabel>{label}</SelectLabel>}
          {options.map((option, index) => {
            // Generate a safe, unique value for each item
            const itemValue = generateSelectItemValue(index, option.value);
            return (
              <SelectItem key={itemValue} value={itemValue}>
                {option.label}
              </SelectItem>
            );
          })}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};

// If you need individual access to the components
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem
} from "@/components/ui/select";

// Export a safe version of SelectItem that ensures value is never empty
export const SafeSelectItem = React.forwardRef<
  React.ElementRef<typeof SelectItem>,
  Omit<React.ComponentPropsWithoutRef<typeof SelectItem>, "value"> & {
    value?: string | null;
    index: number;
  }
>(({ children, value, index, ...props }, ref) => {
  const safeValue = generateSelectItemValue(index, value);
  
  return (
    <SelectItem ref={ref} value={safeValue} {...props}>
      {children}
    </SelectItem>
  );
});
SafeSelectItem.displayName = "SafeSelectItem";

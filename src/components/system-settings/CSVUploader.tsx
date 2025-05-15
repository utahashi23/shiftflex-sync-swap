
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface CSVUploaderProps {
  entityType: 'regions' | 'areas' | 'truck_names';
  onSuccess: () => void;
  requiredColumns: string[];
  optionalColumns?: string[];
  additionalInfo?: string;
}

export const CSVUploader: React.FC<CSVUploaderProps> = ({ 
  entityType, 
  onSuccess, 
  requiredColumns,
  optionalColumns = [],
  additionalInfo
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a valid CSV file",
        variant: "destructive"
      });
      setFile(null);
    }
  };

  const parseCSV = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n');
          const headers = lines[0].split(',').map(header => header.trim());
          
          // Validate that the CSV has the required columns
          for (const requiredColumn of requiredColumns) {
            if (!headers.includes(requiredColumn)) {
              reject(`CSV is missing required column: ${requiredColumn}`);
              return;
            }
          }

          const data = [];
          for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            
            const values = lines[i].split(',').map(value => value.trim());
            if (values.length !== headers.length) {
              continue; // Skip malformed rows
            }
            
            const row: Record<string, string> = {};
            headers.forEach((header, index) => {
              row[header] = values[index];
            });
            
            data.push(row);
          }
          resolve(data);
        } catch (error) {
          reject('Error parsing CSV: ' + error);
        }
      };
      reader.onerror = () => reject('Error reading file');
      reader.readAsText(file);
    });
  };

  const uploadData = async () => {
    if (!file) return;
    
    setIsLoading(true);
    try {
      const data = await parseCSV(file);
      
      if (data.length === 0) {
        toast({
          title: "Empty File",
          description: "The CSV file contains no valid data rows",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      // Upload based on entity type
      if (entityType === 'regions') {
        const { data: result, error } = await supabase
          .from('regions')
          .insert(data.map(row => ({ name: row.name })))
          .select();
          
        if (error) throw error;
      } else if (entityType === 'areas') {
        const { data: result, error } = await supabase
          .from('areas')
          .insert(data.map(row => ({ 
            name: row.name,
            region_id: row.region_id
          })))
          .select();
          
        if (error) throw error;
      } else if (entityType === 'truck_names') {
        const { data: result, error } = await supabase
          .from('truck_names')
          .insert(data.map(row => ({ 
            name: row.name,
            area_id: row.area_id || null
          })))
          .select();
          
        if (error) throw error;
      }

      toast({
        title: "Upload Successful",
        description: `Successfully imported ${data.length} ${entityType}`,
      });
      
      onSuccess();
    } catch (error: any) {
      console.error('Error uploading CSV:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "An error occurred while importing the CSV file",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
        <Input 
          type="file" 
          accept=".csv" 
          onChange={handleFileChange} 
          className="hidden"
          id="csv-file-input"
        />
        <label 
          htmlFor="csv-file-input" 
          className="flex flex-col items-center justify-center cursor-pointer"
        >
          <Upload className="h-8 w-8 text-gray-400 mb-2" />
          <span className="text-sm font-medium mb-1">
            {file ? file.name : 'Click to upload CSV'}
          </span>
          <span className="text-xs text-gray-500">
            Only CSV files are supported
          </span>
        </label>
      </div>
      
      {additionalInfo && (
        <div className="text-sm text-muted-foreground">
          <p>{additionalInfo}</p>
        </div>
      )}
      
      <div className="flex flex-col space-y-2">
        <p className="text-sm font-medium">Required columns:</p>
        <ul className="text-sm list-disc pl-5">
          {requiredColumns.map(col => (
            <li key={col}>{col}</li>
          ))}
        </ul>
      </div>
      
      {optionalColumns && optionalColumns.length > 0 && (
        <div className="flex flex-col space-y-2">
          <p className="text-sm font-medium">Optional columns:</p>
          <ul className="text-sm list-disc pl-5">
            {optionalColumns.map(col => (
              <li key={col}>{col}</li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="flex justify-end pt-2">
        <Button
          onClick={uploadData}
          disabled={!file || isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            'Upload'
          )}
        </Button>
      </div>
    </div>
  );
};

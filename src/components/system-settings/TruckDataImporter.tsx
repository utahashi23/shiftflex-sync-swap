
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Upload, DownloadCloud } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';

type TruckData = {
  region: string;
  area: string;
  truck: string;
  address: string;
};

interface ImportResult {
  updated: number;
  created: number;
  skipped: number;
  errors: string[];
}

export const TruckDataImporter = ({ onSuccess }: { onSuccess: () => void }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [csvData, setCsvData] = useState<TruckData[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const processCSV = (text: string): TruckData[] => {
    const lines = text.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    const regionIndex = headers.indexOf('region');
    const areaIndex = headers.indexOf('area');
    const truckIndex = headers.indexOf('truck');
    const addressIndex = headers.indexOf('address');
    
    if (regionIndex === -1 || areaIndex === -1 || truckIndex === -1 || addressIndex === -1) {
      throw new Error('CSV must contain Region, Area, Truck, and Address columns');
    }
    
    const data: TruckData[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      // Handle quoted fields that might contain commas
      const row: string[] = [];
      let inQuote = false;
      let currentField = '';
      
      for (let j = 0; j < lines[i].length; j++) {
        const char = lines[i][j];
        
        if (char === '"' && (j === 0 || lines[i][j-1] !== '\\')) {
          inQuote = !inQuote;
        } else if (char === ',' && !inQuote) {
          row.push(currentField);
          currentField = '';
        } else {
          currentField += char;
        }
      }
      
      // Add the last field
      row.push(currentField);
      
      // Clean up any quotes
      const cleanRow = row.map(field => {
        let clean = field.trim();
        if (clean.startsWith('"') && clean.endsWith('"')) {
          clean = clean.substring(1, clean.length - 1);
        }
        return clean;
      });
      
      data.push({
        region: cleanRow[regionIndex],
        area: cleanRow[areaIndex],
        truck: cleanRow[truckIndex],
        address: cleanRow[addressIndex]
      });
    }
    
    return data;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    setImportResult(null);
    
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const data = processCSV(text);
      setCsvData(data);
      
      toast({
        title: "CSV Processed",
        description: `Successfully processed ${data.length} truck records`,
      });
    } catch (error: any) {
      console.error('Error processing CSV file:', error);
      setImportError(error.message || 'Failed to process CSV file');
      setCsvData([]);
    }
  };

  const handleSubmit = async () => {
    if (csvData.length === 0) {
      setImportError('No data to import');
      return;
    }
    
    setIsLoading(true);
    setImportError(null);
    
    try {
      const { data: functionData, error: functionError } = await supabase.functions.invoke('import_truck_data', {
        body: { trucks: csvData }
      });
      
      if (functionError) {
        throw functionError;
      }
      
      setImportResult(functionData);
      
      toast({
        title: "Import Complete",
        description: `Created ${functionData.created} and updated ${functionData.updated} truck records.`,
      });
      
      if (functionData.skipped > 0) {
        console.warn('Skipped records during import:', functionData.errors);
      }
      
      onSuccess();
    } catch (error: any) {
      console.error('Error importing truck data:', error);
      setImportError(error.message || 'Failed to import truck data');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadSampleCsv = () => {
    const sample = 'Region,Area,Truck,Address\nMetro 1 West,Metro Area 4,Sample Truck,"123 Sample Street, Sampletown, 3000"';
    const blob = new Blob([sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_truck_data.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Import Truck Data</CardTitle>
        <CardDescription>
          Upload a CSV file with truck information to update the database.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <input 
            type="file" 
            accept=".csv" 
            onChange={handleFileChange} 
            className="hidden"
            id="truck-csv-input"
            disabled={isLoading}
          />
          <label 
            htmlFor="truck-csv-input" 
            className="flex flex-col items-center justify-center cursor-pointer"
          >
            <Upload className="h-8 w-8 text-gray-400 mb-2" />
            <span className="text-sm font-medium mb-1">
              Click to upload CSV file
            </span>
            <span className="text-xs text-gray-500">
              File should contain Region, Area, Truck, and Address columns
            </span>
          </label>
        </div>
        
        <Button 
          variant="outline" 
          size="sm"
          onClick={downloadSampleCsv}
          className="flex items-center gap-2"
        >
          <DownloadCloud className="h-4 w-4" />
          Download Sample CSV
        </Button>
        
        {importError && (
          <Alert variant="destructive">
            <AlertDescription>{importError}</AlertDescription>
          </Alert>
        )}
        
        {csvData.length > 0 && (
          <div className="text-sm">
            <p>Ready to import {csvData.length} truck records</p>
            <div className="mt-2 max-h-36 overflow-y-auto border rounded p-2">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left">Region</th>
                    <th className="text-left">Area</th>
                    <th className="text-left">Truck</th>
                    <th className="text-left">Address</th>
                  </tr>
                </thead>
                <tbody>
                  {csvData.slice(0, 5).map((item, index) => (
                    <tr key={index}>
                      <td>{item.region}</td>
                      <td>{item.area}</td>
                      <td>{item.truck}</td>
                      <td>{item.address}</td>
                    </tr>
                  ))}
                  {csvData.length > 5 && (
                    <tr>
                      <td colSpan={4} className="text-center">
                        {csvData.length - 5} more items...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {importResult && (
          <div className="text-sm space-y-2">
            <p className="font-medium">Import Results:</p>
            <ul>
              <li>Created: {importResult.created} trucks</li>
              <li>Updated: {importResult.updated} trucks</li>
              <li>Skipped: {importResult.skipped} records</li>
            </ul>
            {importResult.errors.length > 0 && (
              <div className="mt-2">
                <p className="font-medium text-amber-600">Warnings:</p>
                <div className="max-h-36 overflow-y-auto border border-amber-200 bg-amber-50 rounded p-2">
                  <ul className="list-disc pl-5">
                    {importResult.errors.map((err, index) => (
                      <li key={index} className="text-amber-700">{err}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSubmit}
            disabled={csvData.length === 0 || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              'Import Truck Data'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

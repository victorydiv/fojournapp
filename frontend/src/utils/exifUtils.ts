import EXIF from 'exif-js';

export interface ExifData {
  latitude?: number;
  longitude?: number;
  dateTime?: Date;
  make?: string;
  model?: string;
  orientation?: number;
}

interface ExifTags {
  GPSLatitude?: number[];
  GPSLatitudeRef?: string;
  GPSLongitude?: number[];
  GPSLongitudeRef?: string;
  DateTime?: string;
  DateTimeOriginal?: string;
  Make?: string;
  Model?: string;
  Orientation?: number;
}

// Convert DMS (Degrees, Minutes, Seconds) to decimal degrees
function dmsToDecimal(dms: number[], ref: string): number {
  if (!dms || dms.length !== 3) return 0;
  
  let decimal = dms[0] + dms[1] / 60 + dms[2] / 3600;
  
  // If reference is South or West, make it negative
  if (ref === 'S' || ref === 'W') {
    decimal = -decimal;
  }
  
  return decimal;
}

// Parse EXIF date string to Date object
function parseExifDate(dateString: string): Date | null {
  if (!dateString) return null;
  
  try {
    // EXIF date format: "YYYY:MM:DD HH:MM:SS"
    const cleanDateString = dateString.replace(/(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
    const date = new Date(cleanDateString);
    
    // Validate the date
    if (isNaN(date.getTime())) {
      return null;
    }
    
    return date;
  } catch (error) {
    console.error('Error parsing EXIF date:', error);
    return null;
  }
}

// Calculate distance between two coordinates in miles
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Extract EXIF data from an image file
export function extractExifData(file: File): Promise<ExifData> {
  return new Promise((resolve) => {
    const result: ExifData = {};
    
    if (!file.type.startsWith('image/')) {
      resolve(result);
      return;
    }
    
    EXIF.getData(file as any, function(this: any) {
      try {
        const tags: ExifTags = EXIF.getAllTags(this);
        console.log('EXIF tags:', tags);
        
        // Extract GPS coordinates
        if (tags.GPSLatitude && tags.GPSLatitudeRef && tags.GPSLongitude && tags.GPSLongitudeRef) {
          result.latitude = dmsToDecimal(tags.GPSLatitude, tags.GPSLatitudeRef);
          result.longitude = dmsToDecimal(tags.GPSLongitude, tags.GPSLongitudeRef);
        }
        
        // Extract date/time (prefer DateTimeOriginal over DateTime)
        const dateString = tags.DateTimeOriginal || tags.DateTime;
        if (dateString) {
          const parsedDate = parseExifDate(dateString);
          if (parsedDate) {
            result.dateTime = parsedDate;
          }
        }
        
        // Extract camera info
        if (tags.Make) {
          result.make = tags.Make;
        }
        
        if (tags.Model) {
          result.model = tags.Model;
        }
        
        if (tags.Orientation) {
          result.orientation = tags.Orientation;
        }
        
        resolve(result);
      } catch (error) {
        console.error('Error extracting EXIF data:', error);
        resolve(result);
      }
    });
  });
}

// Check if EXIF location differs significantly from entry location
export function shouldUpdateLocation(
  exifLat: number, 
  exifLng: number, 
  entryLat: number, 
  entryLng: number, 
  thresholdMiles: number = 1
): boolean {
  if (!exifLat || !exifLng || !entryLat || !entryLng) {
    return false;
  }
  
  const distance = calculateDistance(exifLat, exifLng, entryLat, entryLng);
  return distance > thresholdMiles;
}

// Check if EXIF date differs significantly from entry date
export function shouldPromptDateCorrection(
  exifDate: Date,
  entryDate: string | Date,
  thresholdDays: number = 1
): boolean {
  if (!exifDate || !entryDate) {
    return false;
  }
  
  const entryDateObj = typeof entryDate === 'string' ? new Date(entryDate) : entryDate;
  if (isNaN(entryDateObj.getTime())) {
    return false;
  }
  
  const diffMs = Math.abs(exifDate.getTime() - entryDateObj.getTime());
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  
  return diffDays > thresholdDays;
}

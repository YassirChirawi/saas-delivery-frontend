declare namespace google.maps.places {
    export class Autocomplete {
        constructor(inputField: any, opts?: any);
        addListener(eventName: string, handler: Function): void;
        getPlace(): PlaceResult;
    }

    export interface PlaceResult {
        address_components?: any[];
        formatted_address?: string;
        geometry?: {
            location: any;
            viewport: any;
        };
        place_id?: string;
        html_attributions?: string[];
        name?: string;
        photos?: any[];
        types?: string[];
        url?: string;
        utc_offset_minutes?: number;
        vicinity?: string;
    }
}

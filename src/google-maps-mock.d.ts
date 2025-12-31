declare namespace google.maps.places {
    class Autocomplete {
        constructor(input: any, opts?: any);
        addListener(eventName: string, handler: () => void): void;
        getPlace(): PlaceResult;
    }

    interface PlaceResult {
        geometry?: any;
        formatted_address?: string;
        name?: string;
        [key: string]: any;
    }
}

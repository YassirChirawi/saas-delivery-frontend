import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class NotificationService {

    constructor() { }

    /**
     * Show a simple alert for now.
     * TODO: Replace with a nice Toast/Snackbar component.
     */
    showSuccess(message: string): void {
        // In a real app, use a Toast library like ngx-toastr or specific UI component
        alert(`✅ SUCCÈS: ${message}`);
        console.log('Notification Success:', message);
    }

    showError(message: string): void {
        alert(`❌ ERREUR: ${message}`);
        console.error('Notification Error:', message);
    }

    showInfo(message: string): void {
        alert(`ℹ️ INFO: ${message}`);
        console.log('Notification Info:', message);
    }

    /**
     * Request permission for Web Push Notifications (Future use with Firebase)
     */
    requestPermission(): void {
        if ('Notification' in window) {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    console.log('Notification permission granted.');
                } else {
                    console.warn('Notification permission denied.');
                }
            });
        }
    }
}

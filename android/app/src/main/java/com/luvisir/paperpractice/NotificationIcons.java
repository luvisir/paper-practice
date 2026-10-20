package com.luvisir.paperpractice;

import android.app.Notification;
import android.content.Context;
import android.graphics.BitmapFactory;

/** Shared branding for any future notification; creating a builder does not post one. */
final class NotificationIcons {
    private NotificationIcons() {}
    static Notification.Builder apply(Context context, Notification.Builder builder) {
        return builder.setSmallIcon(R.drawable.ic_notification)
            .setLargeIcon(BitmapFactory.decodeResource(context.getResources(), R.drawable.app_logo));
    }
}

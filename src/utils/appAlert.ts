import { Alert, Platform } from "react-native";

type ConfirmOptions = {
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
};

export function showAppAlert(title: string, message?: string) {
    if (Platform.OS === "web") {
        window.alert(message ? `${title}\n\n${message}` : title);
        return;
    }

    Alert.alert(title, message);
}

export function showAppConfirm({
                                   title,
                                   message,
                                   confirmText,
                                   cancelText,
                               }: ConfirmOptions): Promise<boolean> {
    if (Platform.OS === "web") {
        return Promise.resolve(window.confirm(`${title}\n\n${message}`));
    }

    return new Promise((resolve) => {
        Alert.alert(title, message, [
            {
                text: cancelText,
                style: "cancel",
                onPress: () => resolve(false),
            },
            {
                text: confirmText,
                style: "destructive",
                onPress: () => resolve(true),
            },
        ]);
    });
}
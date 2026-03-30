import AsyncStorage from "@react-native-async-storage/async-storage";
import { userBooks as mockBooks } from "../data/mockBooks";
import { Book } from "../types/book";

const BOOKS_STORAGE_KEY = "user_books";

export async function getStoredBooks(): Promise<Book[]> {
    try {
        const rawValue = await AsyncStorage.getItem(BOOKS_STORAGE_KEY);

        if (!rawValue) {
            await AsyncStorage.setItem(
                BOOKS_STORAGE_KEY,
                JSON.stringify(mockBooks)
            );
            return mockBooks;
        }

        return JSON.parse(rawValue) as Book[];
    } catch (error) {
        console.error("Fout bij ophalen van boeken uit storage:", error);
        return mockBooks;
    }
}

export async function saveStoredBooks(books: Book[]) {
    try {
        await AsyncStorage.setItem(BOOKS_STORAGE_KEY, JSON.stringify(books));
    } catch (error) {
        console.error("Fout bij opslaan van boeken:", error);
    }
}

export async function resetStoredBooks() {
    try {
        await AsyncStorage.removeItem(BOOKS_STORAGE_KEY);
    } catch (error) {
        console.error("Fout bij resetten van boeken:", error);
    }
}

export async function removeStoredBook(bookId: string) {
    try {
        const currentBooks = await getStoredBooks();
        const updatedBooks = currentBooks.filter((book) => book.id !== bookId);
        await saveStoredBooks(updatedBooks);
    } catch (error) {
        console.error("Fout bij verwijderen van boek:", error);
    }
}
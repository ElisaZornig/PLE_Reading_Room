import { Book } from "../types/book";

export const userBooks: Book[] = [
    {
        id: "1",
        title: "De Zeven Zussen",
        author: "Lucinda Riley",
        status: "reading",
        progress: 52,
        currentPage: 340,
        totalPages: 648,
        cover: "",
    },
    {
        id: "2",
        title: "It Ends With Us",
        author: "Colleen Hoover",
        status: "toRead",
        cover: "",
    },
    {
        id: "3",
        title: "The Seven Husbands of Evelyn Hugo",
        author: "Taylor Jenkins Reid",
        status: "finished",
        progress: 100,
        cover: "",
    },
    {
        id: "4",
        title: "Normal People",
        author: "Sally Rooney",
        status: "dnf",
        cover: "",
    },
];
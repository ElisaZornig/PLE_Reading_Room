export const AVATAR_BACKGROUNDS = [
    { id: "soft-pink", color: "#F6D3CB" },
    { id: "sunflower", color: "#F6B23C" },
    { id: "cream", color: "#FFF3D8" },
    { id: "sage", color: "#DDEEDF" },
    { id: "blue", color: "#D8E7F3" },
    { id: "lavender", color: "#E6DDF2" },
];

export function getAvatarBackground(color?: string | null) {
    return (
        AVATAR_BACKGROUNDS.find((background) => background.color === color) ??
        AVATAR_BACKGROUNDS[0]
    );
}
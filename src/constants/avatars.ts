export const AVATARS = [
    { id: "1", image: require("../../assets/avatars/1.png") },
    { id: "2", image: require("../../assets/avatars/2.png") },
    { id: "3", image: require("../../assets/avatars/3.png") },
    { id: "4", image: require("../../assets/avatars/4.png") },
    { id: "5", image: require("../../assets/avatars/5.png") },
    { id: "6", image: require("../../assets/avatars/6.png") },
];

export function getAvatarById(avatarId?: string | null) {
    return AVATARS.find((avatar) => avatar.id === avatarId) ?? AVATARS[0];
}
import { Image, StyleSheet } from "react-native";
import { CoverPlaceholder } from "./CoverPlaceholder";

type Props = {
    title: string;
    cover?: string;
    small?: boolean;
};

export function BookCover({ title, cover, small = false }: Props) {
    const width = small ? 52 : 70;
    const height = small ? 74 : 100;

    if (!cover) {
        return <CoverPlaceholder title={title} />;
    }

    return (
        <Image
            source={{ uri: cover }}
            style={[
                styles.image,
                {
                    width,
                    height,
                },
            ]}
        />
    );
}

const styles = StyleSheet.create({
    image: {
        borderRadius: 12,
    },
});
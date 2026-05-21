import { Image, StyleSheet } from "react-native";
import { CoverPlaceholder } from "./CoverPlaceholder";

type Props = {
    title: string;
    cover?: string;
    small?: boolean;
    width?: number;
    height?: number;
    borderRadius?: number;
};

export function BookCover({
                              title,
                              cover,
                              small = false,
                              width,
                              height,
                              borderRadius = 14,
                          }: Props) {
    const coverWidth = width ?? (small ? 52 : 70);
    const coverHeight = height ?? (small ? 74 : 100);

    if (!cover) {
        return (
            <CoverPlaceholder
                title={title}
                width={coverWidth}
                height={coverHeight}
                borderRadius={borderRadius}
            />
        );
    }

    return (
        <Image
            source={{ uri: cover }}
            style={[
                styles.image,
                {
                    width: coverWidth,
                    height: coverHeight,
                    borderRadius,
                },
            ]}
        />
    );
}

const styles = StyleSheet.create({
    image: {
        resizeMode: "cover",
    },
});
import { pdf, Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
import JsBarcode from 'jsbarcode';

// Register a font that supports Cyrillic
Font.register({
    family: 'Roboto',
    src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf',
});

const styles = StyleSheet.create({
    page: {
        width: "100%",
        height: "100%",
        padding: 4,
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
    },
    carePage: {
        width: "100%",
        height: "100%",
        padding: 2,
        backgroundColor: '#ffffff',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
    },
    careImage: {
        width: '100%',
        height: '100%',
        objectFit: 'contain',
    },
    nameContainer: {
        display: 'flex',
        justifyContent: 'center',
        marginBottom: 2,
    },
    nameText: {
        fontFamily: 'Roboto',
        fontSize: 8,
        textAlign: 'center',
    },
    sizeText: {
        fontFamily: 'Roboto',
        fontSize: 10,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 2,
    },
    barcodeContainer: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
    },
    barcodeImage: {
        width: '34mm',
        height: '8mm',
        objectFit: 'contain',
    }
});

export type LabelType = "barcode" | "care";

export interface ProductLabelData {
    name: string;
    price: number;
    sku: string;
    size?: string | null;
    labelName?: string | null;
    composition?: string | null;
    manufacturer?: string | null;
}

const generateBarcodeDataUrl = (data: string) => {
    const canvas = document.createElement("canvas");
    JsBarcode(canvas, data, {
        format: "EAN13",
        displayValue: true,
        height: 30,
        fontSize: 10,
        margin: 0,
        textMargin: 0,
        width: 1.8
    });
    return canvas.toDataURL("image/jpeg");
};

/**
 * Generates a crisp high-DPI image of the bilingual RU/KZ care label ("Составник")
 * using the browser's native font renderer so all Kazakh Cyrillic glyphs (Ә, І, Ң, Ғ, Ү, Ұ, Қ, Ө, Һ)
 * and bold titles render with 100% fidelity on the exact same 40x24mm page size.
 */
export const generateCareLabelDataUrl = (product: ProductLabelData): string => {
    const canvas = document.createElement("canvas");
    const width = 800;
    const height = 480; // Exact 40:24 aspect ratio (113.38 : 68.03)
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    const rows = [
        {
            title: "Наименование / Атауы: ",
            value: (product.labelName && product.labelName.trim()) ? product.labelName.trim() : (product.name || "—")
        },
        {
            title: "Размер / Өлшемі: ",
            value: (product.size && product.size.trim()) ? product.size.trim() : "—"
        },
        {
            title: "Состав / Құрамы: ",
            value: (product.composition && product.composition.trim()) ? product.composition.trim() : "—"
        },
        {
            title: "Производитель / Өндіруші: ",
            value: (product.manufacturer && product.manufacturer.trim()) ? product.manufacturer.trim() : "DIMMIANI, Казахстан"
        }
    ];

    const padX = 28;
    const maxLineWidth = width - padX * 2;
    const fontFamily = "Arial, 'Helvetica Neue', Roboto, sans-serif";

    // Helper to layout lines for a given fontSize
    const layoutRows = (fontSize: number) => {
        const lineHeight = Math.round(fontSize * 1.28);
        const rowGap = Math.round(fontSize * 0.42);
        const laidOutRows: { segments: { text: string; bold: boolean; x: number }[] }[][] = [];

        for (const row of rows) {
            const lines: { segments: { text: string; bold: boolean; x: number }[] }[] = [];
            let currentLine: { text: string; bold: boolean; x: number }[] = [];
            let curX = 0;

            // Measure bold title
            ctx.font = `bold ${fontSize}px ${fontFamily}`;
            const titleWords = row.title.split(/(?<=\s)/);
            for (const tw of titleWords) {
                const w = ctx.measureText(tw).width;
                if (curX + w > maxLineWidth && currentLine.length > 0) {
                    lines.push({ segments: currentLine });
                    currentLine = [];
                    curX = 0;
                }
                currentLine.push({ text: tw, bold: true, x: curX });
                curX += w;
            }

            // Measure regular value words
            ctx.font = `normal ${fontSize}px ${fontFamily}`;
            const valWords = row.value.split(/(\s+)/);
            for (const vw of valWords) {
                if (!vw) continue;
                const w = ctx.measureText(vw).width;
                if (curX + w > maxLineWidth && currentLine.length > 0 && vw.trim().length > 0) {
                    lines.push({ segments: currentLine });
                    currentLine = [];
                    curX = 0;
                }
                if (curX === 0 && vw.trim().length === 0) continue;
                currentLine.push({ text: vw, bold: false, x: curX });
                curX += w;
            }

            if (currentLine.length > 0) {
                lines.push({ segments: currentLine });
            }
            laidOutRows.push(lines);
        }

        const totalLines = laidOutRows.reduce((acc, r) => acc + r.length, 0);
        const totalHeight = totalLines * lineHeight + (laidOutRows.length - 1) * rowGap;
        return { laidOutRows, lineHeight, rowGap, totalHeight };
    };

    // Pick the largest font size that fits comfortably inside height - 36px
    let chosenFontSize = 27;
    let layout = layoutRows(chosenFontSize);
    while (chosenFontSize > 16 && layout.totalHeight > height - 36) {
        chosenFontSize -= 1;
        layout = layoutRows(chosenFontSize);
    }

    ctx.fillStyle = "#000000";
    ctx.textBaseline = "top";

    let curY = Math.max(16, Math.round((height - layout.totalHeight) / 2));

    for (const rowLines of layout.laidOutRows) {
        for (const line of rowLines) {
            for (const seg of line.segments) {
                ctx.font = `${seg.bold ? "bold" : "normal"} ${chosenFontSize}px ${fontFamily}`;
                ctx.fillText(seg.text, padX + seg.x, curY);
            }
            curY += layout.lineHeight;
        }
        curY += layout.rowGap;
    }

    return canvas.toDataURL("image/png");
};

const LabelsDocument = ({ products, labelType = "barcode" }: { products: ProductLabelData[]; labelType?: LabelType }) => {
    return (
        <Document>
            {products.map((product, index) => {
                if (labelType === "care") {
                    const careUrl = generateCareLabelDataUrl(product);
                    return (
                        <Page key={index} size={[113.38, 68.03]} style={styles.carePage}>
                            <Image src={careUrl} style={styles.careImage} />
                        </Page>
                    );
                }

                const name = product.name.length > 25 ? product.name.substring(0, 23) + "..." : product.name;
                const barcodeUrl = generateBarcodeDataUrl(product.sku);

                return (
                    // size [113.38, 68.03] is exactly 40x24mm (giving a 1mm safe margin for a 42x25 label)
                    <Page key={index} size={[113.38, 68.03]} style={styles.page}>
                        <View style={styles.nameContainer}>
                            <Text style={styles.nameText}>{name}</Text>
                        </View>
                        {!!product.size && <Text style={styles.sizeText}>{product.size}</Text>}
                        <View style={styles.barcodeContainer}>
                            <Image src={barcodeUrl} style={styles.barcodeImage} />
                        </View>
                    </Page>
                );
            })}
        </Document>
    );
};

export const printLabel = async (
    productOrProducts: ProductLabelData | ProductLabelData[],
    labelType: LabelType = "barcode"
) => {
    const products = Array.isArray(productOrProducts) ? productOrProducts : [productOrProducts];

    // Generate PDF blob
    const doc = <LabelsDocument products={products} labelType={labelType} />;
    const asPdf = pdf(doc);
    const blob = await asPdf.toBlob();

    // Create URL and open print dialog
    const url = URL.createObjectURL(blob);

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;
    document.body.appendChild(iframe);

    iframe.onload = () => {
        setTimeout(() => {
            if (iframe.contentWindow) {
                iframe.contentWindow.print();
            } else {
                window.open(url, "_blank");
            }
        }, 500);
    };
};

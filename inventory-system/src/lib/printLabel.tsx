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
        height: '8mm', // Reduced to guarantee it fits safely
        objectFit: 'contain',
    }
});

export interface ProductLabelData {
    name: string;
    price: number;
    sku: string;
    size?: string | null;
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

const LabelsDocument = ({ products }: { products: ProductLabelData[] }) => {
    return (
        <Document>
            {products.map((product, index) => {
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

export const printLabel = async (productOrProducts: ProductLabelData | ProductLabelData[]) => {
    const products = Array.isArray(productOrProducts) ? productOrProducts : [productOrProducts];

    // Generate PDF blob
    const doc = <LabelsDocument products={products} />;
    const asPdf = pdf(doc);
    const blob = await asPdf.toBlob();

    // Create URL and open print dialog
    const url = URL.createObjectURL(blob);

    // Instead of using jsPdf autoPrint (which is proprietary), we open the blob. 
    // Usually browser PDF viewers handle print via Ctrl+P.
    // If we want auto-print, we can use a hidden iframe.
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

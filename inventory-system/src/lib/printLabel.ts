import jsPDF from "jspdf";
import JsBarcode from "jsbarcode";

interface ProductLabelData {
    name: string;
    price: number;
    sku: string;
    size?: string | null;
}

export const printLabel = (productOrProducts: ProductLabelData | ProductLabelData[]) => {
    // Label size: 42mm x 25mm
    const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [42, 25]
    });

    const products = Array.isArray(productOrProducts) ? productOrProducts : [productOrProducts];

    products.forEach((product, index) => {
        if (index > 0) {
            doc.addPage([42, 25], "landscape");
        }

        // Layout:
        // Name (Top, centered)
        // Size (Middle, centered or left)
        // Barcode (Bottom)

        // Product Name
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        const name = product.name.length > 20 ? product.name.substring(0, 18) + "..." : product.name;
        doc.text(name, 21, 5, { align: "center" });

        // Size
        if (product.size) {
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            // doc.text(`Size: ${product.size}`, 21, 10, { align: "center" });
            doc.text(product.size, 21, 10, { align: "center" });
        }

        // Barcode
        const canvas = document.createElement("canvas");
        JsBarcode(canvas, product.sku, {
            format: "EAN13",
            displayValue: true,
            height: 30,
            fontSize: 10,
            margin: 0,
            textMargin: 0,
            width: 1.8 // Slightly wider bars for readability
        });

        const barcodeImg = canvas.toDataURL("image/jpeg");
        // Adjust barcode position to fit bottom
        doc.addImage(barcodeImg, "JPEG", 4, 12, 34, 10);
    });

    doc.autoPrint();
    window.open(doc.output("bloburl"));
};

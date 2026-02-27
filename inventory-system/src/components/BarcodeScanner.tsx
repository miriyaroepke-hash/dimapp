"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, Camera, CheckCircle } from "lucide-react";

interface BarcodeScannerProps {
    onScan: (decodedText: string) => void;
    onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
    const [error, setError] = useState<string | null>(null);
    const [scannedFlash, setScannedFlash] = useState<string | null>(null);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const isScanning = useRef(false);

    const playBeep = () => {
        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContextClass) return;
            const ctx = new AudioContextClass();
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.type = "sine";
            oscillator.frequency.setValueAtTime(880, ctx.currentTime);

            gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.15);

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.start();
            oscillator.stop(ctx.currentTime + 0.15);
        } catch (e) {
            console.error("Audio beep failed", e);
        }
    };

    useEffect(() => {
        const scanner = new Html5Qrcode("reader");
        scannerRef.current = scanner;

        const startScanner = async () => {
            try {
                await scanner.start(
                    { facingMode: "environment" }, // prefer rear camera
                    {
                        fps: 20, // Increased for faster reads
                        qrbox: { width: 280, height: 120 }, // Wider box for 1D barcodes
                        aspectRatio: 1.0,
                    },
                    (decodedText) => {
                        if (!isScanning.current) return;

                        playBeep();
                        setScannedFlash(decodedText);
                        setTimeout(() => setScannedFlash(null), 1200);

                        // Pause to prevent duplicate scans
                        isScanning.current = false;
                        if (scannerRef.current?.isScanning) {
                            scannerRef.current.pause();
                        }

                        onScan(decodedText);

                        // Resume after 1.5s
                        setTimeout(() => {
                            isScanning.current = true;
                            if (scannerRef.current && scannerRef.current.getState() === 2) { // 2 = PAUSED
                                scannerRef.current.resume();
                            }
                        }, 1500);
                    },
                    (errorMessage) => {
                        // ignore general scan failures (happens every frame when no barcode is present)
                    }
                );
                isScanning.current = true;
            } catch (err: any) {
                console.error("Camera start error:", err);
                setError(err.message || "Не удалось запустить камеру. Проверьте разрешения.");
            }
        };

        // Timeout to allow the div#reader to be mounted in the DOM
        const timeout = setTimeout(startScanner, 100);

        return () => {
            clearTimeout(timeout);
            isScanning.current = false;
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().then(() => {
                    scannerRef.current?.clear();
                }).catch(e => console.error("Error stopping scanner", e));
            }
        };
    }, [onScan]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                <div className="flex justify-between items-center p-4 border-b bg-gray-50">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <Camera className="w-5 h-5 text-blue-600" />
                        Сканнер штрихкодов
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-4 flex-1 flex flex-col items-center justify-center bg-gray-100 min-h-[400px]">
                    {error ? (
                        <div className="text-red-500 text-center p-4 bg-red-50 rounded-lg">
                            <p className="font-bold">Ошибка камеры</p>
                            <p className="text-sm mt-1">{error}</p>
                            <p className="text-xs mt-3 text-gray-600">Разрешите доступ к камере в браузере (иконка замочка в адресной строке) и обновите страницу.</p>
                        </div>
                    ) : (
                        <div className="relative w-full">
                            {scannedFlash && (
                                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-green-500/90 rounded-lg animate-in fade-in duration-200">
                                    <CheckCircle className="w-16 h-16 text-white mb-4" />
                                    <span className="text-white font-bold text-xl drop-shadow-md">Отсканировано!</span>
                                    <span className="text-green-100 font-mono text-lg mt-2 bg-black/30 px-3 py-1 rounded">{scannedFlash}</span>
                                </div>
                            )}
                            <div id="reader" className="w-full bg-black rounded-lg overflow-hidden shadow-inner min-h-[300px]"></div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-gray-50 border-t text-sm text-center text-gray-500">
                    Наведите заднюю камеру на штрихкод.
                </div>
            </div>
        </div>
    );
}

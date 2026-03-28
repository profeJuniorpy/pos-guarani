import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X } from 'lucide-react';

export const BarcodeScanner = ({ onScan, onClose }) => {
  const scannerRef = useRef(null);
  const regionId = 'reader-region';

  useEffect(() => {
    const html5QrCode = new Html5Qrcode(regionId);
    scannerRef.current = html5QrCode;

    const config = { fps: 10, qrbox: { width: 250, height: 150 } };

    html5QrCode.start(
      { facingMode: "environment" },
      config,
      (decodedText) => {
        onScan(decodedText);
        stopScanner();
      },
      (errorMessage) => {
        // Handle error if needed
      }
    ).catch((err) => {
      console.error("Scanner error:", err);
    });

    return () => {
      stopScanner();
    };
  }, []);

  const stopScanner = () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.stop().then(() => {
        scannerRef.current.clear();
      }).catch(err => console.error("Error stopping scanner", err));
    }
  };

  return (
    <div className="scanner-overlay">
      <div className="scanner-container glass">
        <div className="scanner-header">
          <h3>Escanear Código</h3>
          <button onClick={onClose} className="close-btn"><X /></button>
        </div>
        <div id={regionId} className="scanner-view"></div>
        <div className="scanner-footer">
          <p>Apunta al código de barras del producto</p>
        </div>
      </div>

      <style>{`
        .scanner-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.8);
          z-index: 2000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .scanner-container {
          width: 100%;
          max-width: 400px;
          border-radius: var(--radius);
          padding: 1.5rem;
          color: white;
        }

        .scanner-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .close-btn { background: none; color: white; }

        .scanner-view {
          width: 100%;
          background: black;
          border-radius: 8px;
          overflow: hidden;
        }

        .scanner-footer {
          margin-top: 1rem;
          text-align: center;
          font-size: 14px;
          opacity: 0.8;
        }
      `}</style>
    </div>
  );
};

import { motion } from "framer-motion";
import { Download, Smartphone, Tv } from "lucide-react";
import NavBar  from "../../components/NavBar";
import Footer  from "../../components/Footer";
export default function DownloadPage() {
    return (
        <main className="min-h-screen bg-[#121212] text-[#EAEAEA] flex flex-col items-center justify-center font-[Poppins]">
            {/* Animated Hero Section */}
            <NavBar />
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
                className="text-center space-y-4 my-20"
            >
                <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.6 }}
                    className="flex items-center justify-center gap-3"
                >
                    <Smartphone className="text-[#DAA520] w-8 h-8" />
                    <h1 className="text-4xl font-semibold">StreamSynx App</h1>
                </motion.div>
                <p className="text-[#A0A0A0] max-w-md mx-auto">
                    Take your watchlists, favorites, and buddies anywhere.
                    Stream your world, now on Android and Android TV.
                </p>
            </motion.div>

            {/* Animated Download Buttons */}
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
                <motion.a
                    href="/android.apk"
                    download
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="flex items-center justify-center gap-3 px-6 py-3 rounded-2xl bg-[#DAA520] text-black font-medium shadow-lg hover:bg-[#C8941A] transition-colors"
                >
                    <Download className="w-5 h-5" />
                    Download for Android
                </motion.a>

                <motion.a
                    href="/tv.apk"
                    download
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="flex items-center justify-center gap-3 px-6 py-3 rounded-2xl border border-[#DAA520] text-[#DAA520] font-medium shadow-lg hover:bg-[#DAA520] hover:text-black transition-colors"
                >
                    <Tv className="w-5 h-5" />
                    Download for Android TV
                </motion.a>
            </div>

            {/* Optional Preview / QR Code Section */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-12 text-center space-y-3"
            >
                <img
                    src="/images/app-preview.png"
                    alt="App Preview"
                    className="w-75 h-auto rounded-2xl shadow-lg mx-auto"
                />
                <p className="text-[#A0A0A0] text-sm">
                    For Downloader on Android TV, enter streamsynx.vercel.app/tv.apk directly.
                </p>
            </motion.div>

            <Footer />
        </main>
    );
}

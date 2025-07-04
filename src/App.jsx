import { useState, useCallback } from 'react';
import { Upload, Image as ImageIcon, Copy, Check, AlertTriangle, Loader } from 'lucide-react';

const App = () => {
  const [image, setImage] = useState(null);
  const [description, setDescription] = useState('');
  const [keywords, setKeywords] = useState({ shortTail: [], longTail: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState({ description: false, short: false, long: false });

  const imageToText = async (imageFile, token) => {
    const response = await fetch(
      `/.netlify/functions/image-proxy?model=Salesforce/blip-image-captioning-large&token=${token}&type=${imageFile.type}`,
      {
        method: "POST",
        body: imageFile,
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
    }

    const result = await response.json();
    return result[0].generated_text;
  };

  const textToKeywords = async (text, token) => {
    const response = await fetch(
      `/.netlify/functions/image-proxy?model=ml6team/keyphrase-generation-t5-base-presentation&token=${token}&type=application/json`,
      {
        method: "POST",
        body: JSON.stringify({ inputs: text }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
    }

    const result = await response.json();
    const keywords = result[0].generated_text.split(",").map(k => k.trim());

    const shortTail = keywords.filter(k => k.split(" ").length <= 2);
    const longTail = keywords.filter(k => k.split(" ").length > 2);

    return { shortTail, longTail };
  };

  const handleImageUpload = useCallback(async (file) => {
    if (file && file.type.startsWith('image/')) {
      setLoading(true);
      setError(null);
      setDescription('');
      setKeywords({ shortTail: [], longTail: [] });
      setImage(URL.createObjectURL(file));

      try {
        const token = import.meta.env.VITE_HUGGING_FACE_TOKEN;
        if (!token) {
          throw new Error("Hugging Face API token is not set. Please add it to your .env file.");
        }

        const desc = await imageToText(file, token);
        const kw = await textToKeywords(desc, token);

        setDescription(desc);
        setKeywords(kw);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    } else {
      setError('Please upload a valid image file.');
    }
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    handleImageUpload(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopied({ ...copied, [type]: true });
    setTimeout(() => setCopied({ ...copied, [type]: false }), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4 sm:p-6 md:p-10">
      <div className="w-full max-w-4xl">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            AI Image Describer
          </h1>
          <p className="text-gray-400 mt-2">
            Upload an image and let AI generate a description and keywords for you.
          </p>
        </header>

        <main className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div
            className="border-2 border-dashed border-gray-600 rounded-lg p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-purple-400 transition-colors"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => document.getElementById('file-upload').click()}
          >
            <Upload className="w-12 h-12 text-gray-500 mb-4" />
            <p className="text-lg">Drag & drop an image here, or click to select a file</p>
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept="image/*"
              onChange={(e) => handleImageUpload(e.target.files[0])}
            />
          </div>

          <div className="space-y-6">
            {image && (
              <div className="relative group">
                <img src={image} alt="Uploaded preview" className="rounded-lg shadow-lg w-96 mx-auto" />
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <ImageIcon className="w-16 h-16 text-white" />
                </div>
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center p-4 bg-gray-800 rounded-lg">
                <Loader className="w-8 h-8 animate-spin text-purple-400" />
                <p className="ml-4 text-lg">Analyzing image...</p>
              </div>
            )}

            {error && (
              <div className="flex items-center p-4 bg-red-900/50 border border-red-700 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-400 mr-3" />
                <p className="text-red-400">{error}</p>
              </div>
            )}

            {description && (
              <div className="p-4 bg-gray-800 rounded-lg">
                <h2 className="text-xl font-semibold mb-2 text-purple-300">Description</h2>
                <div className="relative">
                  <p className="text-gray-300 pr-10">{description}</p>
                  <button
                    onClick={() => handleCopy(description, 'description')}
                    className="absolute top-0 right-0 text-gray-400 hover:text-white transition"
                  >
                    {copied.description ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            )}

            {keywords.shortTail.length > 0 && (
              <div className="p-4 bg-gray-800 rounded-lg">
                <h2 className="text-xl font-semibold mb-2 text-purple-300">Short-tail Keywords</h2>
                <div className="relative">
                  <p className="text-gray-300 pr-10">{keywords.shortTail.join(', ')}</p>
                   <button
                    onClick={() => handleCopy(keywords.shortTail.join(', '), 'short')}
                    className="absolute top-0 right-0 text-gray-400 hover:text-white transition"
                  >
                    {copied.short ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            )}

            {keywords.longTail.length > 0 && (
              <div className="p-4 bg-gray-800 rounded-lg">
                <h2 className="text-xl font-semibold mb-2 text-purple-300">Long-tail Keywords</h2>
                <div className="relative">
                  <p className="text-gray-300 pr-10">{keywords.longTail.join(', ')}</p>
                   <button
                    onClick={() => handleCopy(keywords.longTail.join(', '), 'long')}
                    className="absolute top-0 right-0 text-gray-400 hover:text-white transition"
                  >
                    {copied.long ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;

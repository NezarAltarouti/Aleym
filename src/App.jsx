import { useState } from "react";
import Home from "./Pages/Home";
import SourcesManagements from "./Pages/SourcesManagement";
import AleymFeed from "./Pages/AleymFeed";
import ArticlePage from "./Pages/ArticlePage";

export default function App() {
  const [page, setPage] = useState("home");
  const [selectedArticleId, setSelectedArticleId] = useState(null);

  const navigateTo = (p, data) => {
    if (p === "article" && data?.articleId) {
      setSelectedArticleId(data.articleId);
    }
    setPage(p);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@700&family=Literata:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300;1,400&family=Source+Serif+4:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500&family=IBM+Plex+Mono:wght@300;400;500&display=swap');

        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #0e0e12; overflow-x: hidden; }

        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideInFromRight {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }

        html { scrollbar-width: thin; scrollbar-color: rgba(199,146,234,0.2) transparent; }

        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb {
          background: rgba(199,146,234,0.15);
          border-radius: 100px;
          border: 1px solid transparent;
          background-clip: padding-box;
          transition: background 0.3s ease;
        }
        ::-webkit-scrollbar-thumb:hover { background: rgba(199,146,234,0.35); }
        ::-webkit-scrollbar-thumb:active { background: rgba(199,146,234,0.5); }
        ::-webkit-scrollbar-corner { background: transparent; }

        body { overflow-y: overlay; }
        @supports not (overflow-y: overlay) { body { overflow-y: auto; } }
      `}</style>

      {page === "home" && <Home navigateTo={navigateTo} />}
      {page === "sources" && <SourcesManagements navigateTo={navigateTo} />}
      {page === "aleym" && <AleymFeed navigateTo={navigateTo} />}
      {page === "article" && <ArticlePage articleId={selectedArticleId} navigateTo={navigateTo} />}
    </>
  );
}
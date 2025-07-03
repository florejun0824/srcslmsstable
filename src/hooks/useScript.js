import { useState, useEffect } from 'react';

const useScript = (url, cssUrl) => {
    const [isLoaded, setIsLoaded] = useState(!!window.Quill);

    useEffect(() => {
        if (window.Quill) {
            setIsLoaded(true);
            return;
        }

        let script = document.querySelector(`script[src="${url}"]`);
        let link = document.querySelector(`link[href="${cssUrl}"]`);

        const handleScriptLoad = () => {
            if (window.Quill) setIsLoaded(true);
        };

        if (!script) {
            script = document.createElement('script');
            script.src = url;
            script.async = true;
            document.body.appendChild(script);
            script.addEventListener('load', handleScriptLoad);
        } else if (window.Quill) {
            handleScriptLoad();
        }
        
        if (cssUrl && !link) {
            link = document.createElement('link');
            link.rel = "stylesheet";
            link.href = cssUrl;
            document.head.appendChild(link);
        }

        return () => {
            if (script) script.removeEventListener('load', handleScriptLoad);
        };
    }, [url, cssUrl]);

    return isLoaded;
};

export default useScript;
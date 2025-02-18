import { useState, useEffect } from "react";

const SearchBar = ({ isSearchBarOpen, handleSearch }) => {
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            if (searchQuery.trim() !== "") {
                handleSearch(searchQuery);
            }
        }, 500); // Wait for 500ms after user stops typing

        return () => clearTimeout(delayDebounce); // Cleanup timeout on each new keystroke
    }, [searchQuery, handleSearch]);

    return (
        <div className={`w-full bg-tertiary ${isSearchBarOpen ? 'flex' : 'hidden'} transition-all duration-300`}>
            <div className="flex justify-between items-center w-full px-6 py-3 gap-2">
                <input
                    type="text"
                    className="w-full text-md h-8 pl-4 shadow-lg rounded-md text-primary"
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button 
                    className="h-8 px-4 rounded-md bg-secondary hover:bg-primary text-primary hover:text-secondary transition-all duration-300 cursor-pointer"
                    onClick={() => handleSearch(searchQuery)}
                >
                    Search
                </button>
            </div>
        </div>
    );
};

export default SearchBar;

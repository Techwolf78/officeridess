// Manage recent searches in localStorage
// Keeps max 3 recent searches, prevents duplicates

const RECENT_FROM_KEY = 'recentSearchesFrom';
const RECENT_TO_KEY = 'recentSearchesTo';
const MAX_SEARCHES = 3;

export interface RecentSearch {
  name: string;
  lat: number;
  lng: number;
}

// Get recent origin searches
export function getRecentFromSearches(): RecentSearch[] {
  try {
    const stored = localStorage.getItem(RECENT_FROM_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading recent searches:', error);
    return [];
  }
}

// Get recent destination searches
export function getRecentToSearches(): RecentSearch[] {
  try {
    const stored = localStorage.getItem(RECENT_TO_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading recent searches:', error);
    return [];
  }
}

// Add origin search
export function addRecentFromSearch(search: RecentSearch): void {
  try {
    let searches = getRecentFromSearches();
    
    // Remove if already exists (avoid duplicates)
    searches = searches.filter(s => s.name !== search.name);
    
    // Add to start
    searches.unshift(search);
    
    // Keep only 3 most recent
    searches = searches.slice(0, MAX_SEARCHES);
    
    localStorage.setItem(RECENT_FROM_KEY, JSON.stringify(searches));
  } catch (error) {
    console.error('Error saving recent search:', error);
  }
}

// Add destination search
export function addRecentToSearch(search: RecentSearch): void {
  try {
    let searches = getRecentToSearches();
    
    // Remove if already exists (avoid duplicates)
    searches = searches.filter(s => s.name !== search.name);
    
    // Add to start
    searches.unshift(search);
    
    // Keep only 3 most recent
    searches = searches.slice(0, MAX_SEARCHES);
    
    localStorage.setItem(RECENT_TO_KEY, JSON.stringify(searches));
  } catch (error) {
    console.error('Error saving recent search:', error);
  }
}

// Clear all recent searches
export function clearAllRecentSearches(): void {
  try {
    localStorage.removeItem(RECENT_FROM_KEY);
    localStorage.removeItem(RECENT_TO_KEY);
  } catch (error) {
    console.error('Error clearing recent searches:', error);
  }
}

export async function fetchExplanation(word: string, englishReference: string, authKey: string) {
    const cachedData = localStorage.getItem('explanations');
    const explanations = cachedData ? JSON.parse(cachedData) : {};

    if (explanations[word]) {
        return explanations[word];
    }

    const response = await fetch('/api/explain', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authKey}`,
        },
        body: JSON.stringify({ word, englishReference }),
    });

    if (!response.ok) {
        throw new Error('Failed to fetch explanation');
    }

    const data = await response.json();
    explanations[word] = data;
    localStorage.setItem('explanations', JSON.stringify(explanations));
    return data;
}

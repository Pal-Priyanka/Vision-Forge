import html2canvas from 'html2canvas';

/**
 * Exports a DOM element as a PNG image
 * @param elementId The ID of the element to export
 * @param fileName The name of the file to save
 */
export const exportChartAsPNG = async (elementId: string, fileName: string) => {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error(`Element with ID ${elementId} not found`);
        return;
    }

    try {
        // Use html2canvas to capture the element
        const canvas = await html2canvas(element, {
            backgroundColor: '#0a0a0a', // Match our dark theme background
            scale: 2, // Higher resolution
            logging: false,
            useCORS: true,
        });

        // Convert canvas to image data
        const image = canvas.toDataURL('image/png');

        // Create a temporary link to download the image
        const link = document.createElement('a');
        link.href = image;
        link.download = `${fileName}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error('Failed to export chart:', error);
    }
};

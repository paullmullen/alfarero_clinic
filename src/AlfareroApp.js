import React from 'react';
import { UiProvider } from './context/UiContext';
import { RouterPage } from './pages/RouterPage';

export const AlfareroApp = () => {
    return (
        <UiProvider>
            <RouterPage />
        </UiProvider>
    )
}

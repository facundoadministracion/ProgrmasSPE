export const Spinner = () => (
    <div className="border-gray-300 h-20 w-20 animate-spin rounded-full border-8 border-t-blue-600" />
);

export const FullPageSpinner = () => (
    <div className="fixed inset-0 z-50 flex h-screen w-screen items-center justify-center bg-white bg-opacity-50">
        <Spinner />
    </div>
);

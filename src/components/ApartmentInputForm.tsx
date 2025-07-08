// Placeholder for ApartmentInputForm
export default function ApartmentInputForm() {
  return (
    <form className="flex flex-col gap-4 max-w-md mx-auto w-full p-4 sm:p-2">
      <input type="text" placeholder="Current Address" required className="px-4 py-3 sm:px-3 sm:py-2 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none w-full text-base sm:text-sm" />
      <input type="text" placeholder="Desired Area" required className="px-4 py-3 sm:px-3 sm:py-2 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none w-full text-base sm:text-sm" />
      <input type="number" placeholder="Budget (€)" required className="px-4 py-3 sm:px-3 sm:py-2 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none w-full text-base sm:text-sm" />
      <button type="submit" className="bg-blue-600 text-white rounded-full px-8 py-4 sm:px-4 sm:py-3 font-bold text-lg sm:text-base mt-2 shadow-md transition hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-400 w-auto sm:w-full text-center">Find Matches</button>
    </form>
  );
} 
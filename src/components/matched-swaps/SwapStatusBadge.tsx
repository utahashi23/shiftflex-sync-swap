
interface SwapStatusBadgeProps {
  status: string;
  isAcceptedByOthers?: boolean;
}

const SwapStatusBadge = ({ status, isAcceptedByOthers = false }: SwapStatusBadgeProps) => {
  return (
    <div className="flex items-center gap-2">
      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
        status === 'pending' ? 'bg-amber-100 text-amber-800' :
        status === 'accepted' ? 'bg-blue-100 text-blue-800' :
        'bg-green-100 text-green-800'
      }`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>

      {/* Show a badge when the swap is accepted by others */}
      {isAcceptedByOthers && (
        <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
          Awaiting finalization
        </span>
      )}
    </div>
  );
};

export default SwapStatusBadge;

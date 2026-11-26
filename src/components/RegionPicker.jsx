import { useRegion } from "../context/RegionContext";

export default function RegionPicker({ trigger, className = "inline-flex cursor-pointer" }) {
  const { region, setIsLocationModalOpen } = useRegion();

  const handleOpen = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (setIsLocationModalOpen) {
      setIsLocationModalOpen(true);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleOpen(e);
        }
      }}
      aria-haspopup="dialog"
      aria-label={`Delivery location: ${region?.name || "Varanasi"}. Change`}
      className={className}
    >
      {trigger ? trigger(region || { name: "Varanasi" }) : <span>{region?.name || "Varanasi"}</span>}
    </div>
  );
}
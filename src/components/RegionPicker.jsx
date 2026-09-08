import { useRegion } from "../context/RegionContext";

export default function RegionPicker({ trigger }) {
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
      className="inline-flex cursor-pointer"
    >
      {trigger ? trigger(region || { name: "Varanasi" }) : <span>{region?.name || "Varanasi"}</span>}
    </div>
  );
}
const StatusBadge = ({ actif }) => (
  <span className={actif ? "status-active" : "status-inactive"}>
    {actif ? "Actif" : "Inactif"}
  </span>
);

export default StatusBadge;
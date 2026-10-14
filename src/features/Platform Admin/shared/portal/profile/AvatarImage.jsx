import { useState } from "react";
import { initials } from "../../utils/validation";
import "./AvatarImage.css";

/** Avatar contents: the photo when it loads, otherwise the user's initials. */
export default function AvatarImage({ photo, name, onError }) {
  const [failed, setFailed] = useState("");
  if (photo && failed !== photo) {
    return (
      <img
        className="pp-avatar-img"
        src={photo}
        alt=""
        onError={() => {
          setFailed(photo);
          onError?.();
        }}
      />
    );
  }
  return <span aria-hidden="true">{initials(name)}</span>;
}

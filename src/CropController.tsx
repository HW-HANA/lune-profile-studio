import { CropDialog } from "./CropDialog";
import { defaultCrop, postImageAspect, type CropTarget } from "./crop";
import { useStudio } from "./storage";

export function CropController({
  target,
  onClose,
}: {
  target: CropTarget;
  onClose: () => void;
}) {
  const { project, change } = useStudio();
  const post =
    target.kind === "post"
      ? project.profile.posts.find((p) => p.id === target.postId)
      : undefined;
  const src =
    target.src ??
    (target.kind === "post"
      ? post?.images[target.image]
      : project.profile[target.kind]);
  if (!src || (target.kind === "post" && !post)) return null;
  const value = target.src
    ? defaultCrop()
    : target.kind === "post"
      ? post!.imageCrops[target.image]
      : project.profile[target.kind === "avatar" ? "avatarCrop" : "coverCrop"];
  const aspect =
    target.kind === "avatar"
      ? 1
      : target.kind === "cover"
        ? 468 / 147
        : (target.aspect ??
          postImageAspect(
            Math.max(post!.images.length, target.image + 1),
            target.image,
            post!.imageAspect,
          ));
  return (
    <CropDialog
      title={
        target.kind === "avatar"
          ? "裁切头像"
          : target.kind === "cover"
            ? "裁切封面"
            : "裁切动态图片 " + (target.image + 1)
      }
      src={src}
      value={value}
      aspect={aspect}
      round={target.kind === "avatar"}
      onClose={onClose}
      onConfirm={(crop) => {
        change((draft) => {
          if (target.kind === "post") {
            const item = draft.profile.posts.find(
              (p) => p.id === target.postId,
            );
            if (!item) return;
            if (target.src) item.images[target.image] = target.src;
            item.imageCrops[target.image] = crop;
          } else {
            if (target.src) draft.profile[target.kind] = target.src;
            draft.profile[
              target.kind === "avatar" ? "avatarCrop" : "coverCrop"
            ] = crop;
          }
        });
        onClose();
      }}
    />
  );
}

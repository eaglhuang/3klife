// @spec-source → 見 docs/cross-reference-index.md
import { _decorator, Component, Camera } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('DraggableButton')
export class DraggableButton extends Component {
    @property(Camera) mainCamera: Camera = null!;
}

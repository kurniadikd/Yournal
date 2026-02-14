import { Plugin, PluginKey } from '@tiptap/pm/state';
import Image from '@tiptap/extension-image';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    resizableImage: {
      setImageProperties: (attributes: { width?: number | string, height?: number | string }) => ReturnType
    }
  }
}

export const ResizableImage = Image.extend({
  name: 'resizableImage',
  
  draggable: true,

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        renderHTML: attributes => ({
          width: attributes.width,
        }),
      },
      height: {
        default: null, 
        renderHTML: attributes => ({
           height: attributes.height,
        }),
      },
    }
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      let currentNode = node // Defines mutable node reference in closure scope

      const container = document.createElement('div')
      container.classList.add('resizable-image-wrapper')
      container.contentEditable = 'false'
      
      const img = document.createElement('img')
      img.src = node.attrs.src
      img.alt = node.attrs.alt || ''
      img.title = node.attrs.title || ''
      img.draggable = false // Disable native drag on image to prevent interference with resize
      img.classList.add('resizable-image')

      // Styles application
      if (!node.attrs.width && !node.attrs.height) {
          img.style.height = '240px'
          img.style.width = 'auto'
      } else {
          if (node.attrs.width) img.style.width = typeof node.attrs.width === 'number' ? `${node.attrs.width}px` : node.attrs.width
          if (node.attrs.height) img.style.height = typeof node.attrs.height === 'number' ? `${node.attrs.height}px` : node.attrs.height
      }

      // 1. Selection Handler
      container.addEventListener('click', () => {
        if (typeof getPos === 'function') {
           const pos = getPos()
           if (pos !== undefined) {
             editor.commands.setNodeSelection(pos)
           }
        }
      })

      // 2. Resize Handle
      const resizeHandle = document.createElement('div')
      resizeHandle.classList.add('resize-handle')
      
      let startX: number
      let startWidth: number
      let aspectRatio: number

      const onMouseMove = (e: MouseEvent) => {
        const currentX = e.clientX
        const diffX = currentX - startX

        const newWidth = Math.max(50, startWidth + diffX) 
        
        if (aspectRatio && !isNaN(aspectRatio) && aspectRatio !== 0) {
            const newHeight = newWidth / aspectRatio
            img.style.width = `${newWidth}px`
            img.style.height = `${newHeight}px`
        } else {
             img.style.width = `${newWidth}px`
             img.style.height = 'auto'
        }
      }

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        
        if (typeof getPos === 'function') {
           const pos = getPos()
           if (pos !== undefined) {
             editor.commands.command(({ tr }) => {
               const newWidth = parseFloat(img.style.width)
               const newHeight = parseFloat(img.style.height)

               tr.setNodeMarkup(pos, undefined, {
                 ...currentNode.attrs, // Use updated attributes
                 width: isNaN(newWidth) ? null : newWidth,
                 height: isNaN(newHeight) ? null : newHeight
               })
               return true
             })
           }
        }
      }

      resizeHandle.addEventListener('mousedown', (e) => {
        e.preventDefault() 
        e.stopPropagation() 
        
        startX = e.clientX
        startWidth = img.offsetWidth
        const startHeight = img.offsetHeight
        
        if (startHeight > 0) {
             aspectRatio = startWidth / startHeight
        } else {
            aspectRatio = 1
        }

        document.addEventListener('mousemove', onMouseMove)
        document.addEventListener('mouseup', onMouseUp)
      })

      // 3. Delete Button
      const deleteBtn = document.createElement('button')
      deleteBtn.classList.add('image-delete-btn')
      deleteBtn.innerHTML = '<span class="material-symbols-rounded">close</span>'
      deleteBtn.title = "Hapus Gambar"
      deleteBtn.addEventListener('mousedown', (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (typeof getPos === 'function') {
            const pos = getPos()
            if (pos !== undefined) {
              editor.commands.deleteRange({ from: pos, to: pos + 1 })
              editor.commands.focus()
            }
        }
      })

      container.appendChild(img)
      container.appendChild(resizeHandle)
      container.appendChild(deleteBtn)

      
      return {
        dom: container,
        selectNode: () => {
            container.classList.add('ProseMirror-selectednode')
            img.classList.add('ProseMirror-selectednode')
        },
        deselectNode: () => {
            container.classList.remove('ProseMirror-selectednode')
            img.classList.remove('ProseMirror-selectednode')
        },
        ignoreMutation: (mutation) => {
            return mutation.type === 'attributes' && mutation.attributeName === 'style' ? false : true;
        },
        update: (updatedNode) => {
            if (updatedNode.type.name !== 'resizableImage') return false

            // Update internal node reference
            currentNode = updatedNode

            // Update DOM
            if (updatedNode.attrs.src !== img.src) img.src = updatedNode.attrs.src
            if (updatedNode.attrs.alt !== img.alt) img.alt = updatedNode.attrs.alt
            
            // Update dimensions
            if (updatedNode.attrs.width) {
                 img.style.width = typeof updatedNode.attrs.width === 'number' ? `${updatedNode.attrs.width}px` : updatedNode.attrs.width
            }
            if (updatedNode.attrs.height) {
                 img.style.height = typeof updatedNode.attrs.height === 'number' ? `${updatedNode.attrs.height}px` : updatedNode.attrs.height
            }
            
            return true
        },
        destroy: () => {
           // Cleanup global listeners if component is destroyed mid-drag
           document.removeEventListener('mousemove', onMouseMove)
           document.removeEventListener('mouseup', onMouseUp)
        }
      }
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('resizableImagePaste'),
        props: {
          handlePaste: (view, event, _slice) => {
            const items = Array.from(event.clipboardData?.items || []);
            const imageItem = items.find(item => item.type.startsWith('image/'));

            if (imageItem) {
              const file = imageItem.getAsFile();
              if (file) {
                const reader = new FileReader();
                reader.onload = (readerEvent) => {
                  const src = readerEvent.target?.result;
                  if (typeof src === 'string') {
                    const node = view.state.schema.nodes[this.name].create({ src });
                    const transaction = view.state.tr.replaceSelectionWith(node);
                    view.dispatch(transaction);
                  }
                };
                reader.readAsDataURL(file);
                // We return true to indicate we handled it? 
                // Wait, FileReader is async. We should prevent default immediately.
                // But handlePaste expects bool. If we return true, it suppresses other handlers.
                // Since we start async read, we just return true.
                return true;
              }
            }
            return false;
          }
        }
      })
    ]
  },
})

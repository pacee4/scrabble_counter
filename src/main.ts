import { getResourcesToLoad } from '@/editable/settings';
import { displayError } from '@/core/asset_loader';
import { screen } from '@/screen';
import { UI } from '@/dom';

// ASYNCHRONOUS INITIALIZATION OF THE PROJECT
if (!window.loadingError) {
    screen.init(getResourcesToLoad())
    .then(()=>{
        window.removeLoadingEventListeners!();
        window.removeLoadingEventListeners = null;
    })
    .catch((error)=>{
        console.error(error);
        displayError(String(error));
    });
}

// LOAD THE PROJECT INFORMATION
UI.modal.fetchInfo(import.meta.env.DEV ? "./project_directory.json" : "/projects/project_directory.json");
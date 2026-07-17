import { getResourcesToLoad } from '@/editable/settings';
import { displayError } from '@/core/asset_loader';
import { screen } from '@/screen';
import { UI } from '@/dom';

// АСИНХРОННАЯ ИНИЦИАЛИЗАЦИЯ ПРОЕКТА
if (!window.loadingError) {
    screen.init(getResourcesToLoad())
    .then(()=>{
        window.removeLoadingEventListeners!();
        window.removeLoadingEventListeners = null;
    })
    .catch((error)=>{
        displayError(String(error));
        console.error(error);
    });
}

// ЗАГРУЗКА ИНФОРМАЦИИ
UI.modal.fetchInfo(import.meta.env.DEV ? "./project_directory.json" : "/project/game_directory.json");
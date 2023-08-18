

export const getUsuarioStorage = () => {
    return {
        host: localStorage.getItem('host'),
        servicio: localStorage.getItem('servicio'),
    }
}
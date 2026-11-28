const React = require('react');
const { createContext, useContext } = React;

const NotificationStatusContext = createContext({
  granted: null,
  refresh: async () => {},
});

function useNotificationStatus() {
  return useContext(NotificationStatusContext);
}

module.exports = { NotificationStatusContext, useNotificationStatus };

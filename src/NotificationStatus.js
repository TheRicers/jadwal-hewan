const React = require('react');
const { createContext, useContext } = React;

const NotificationStatusContext = createContext({ granted: true });

function useNotificationStatus() {
  return useContext(NotificationStatusContext);
}

module.exports = { NotificationStatusContext, useNotificationStatus };

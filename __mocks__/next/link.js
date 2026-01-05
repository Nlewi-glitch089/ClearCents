const React = require('react');

function Link({ children, href, ...props }) {
  return React.createElement('a', { href, ...props }, children);
}

module.exports = Link;
module.exports.default = Link;

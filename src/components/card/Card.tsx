import { styled, Card as MuiCard } from "@mui/material";

type CardProps = {
  children: React.ReactNode;
};

const StyledMuiCard = styled(MuiCard)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  padding: theme.spacing(4),
  gap: theme.spacing(2),
  boxShadow:
    "hsla(220, 30%, 5%, 0.05) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.05) 0px 15px 35px -5px",
  ...theme.applyStyles(theme.palette.mode, {
    boxShadow:
      "hsla(220, 30%, 5%, 0.5) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.08) 0px 15px 35px -5px",
  }),
}));

const Card = ({ children, ...props }: CardProps) => {
  return <StyledMuiCard {...props}>{children}</StyledMuiCard>;
};

export default Card;
